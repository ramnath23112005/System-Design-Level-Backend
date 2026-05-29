import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  IUser,
  IPaginationParams,
  IPaginatedResponse,
  EVENT_TYPES,
} from '@urlshortener/shared';
import { UserModel, LinkModel, ApiKeyModel } from '../models';
import { AppError } from '../middleware/error-handler.middleware';
import { logger } from '../utils/logger';
import { eventEmitter } from '../utils/events';
import { query } from '../database';

export class UserService {
  static async getProfile(userId: string): Promise<IUser> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }
    return user;
  }

  static async updateProfile(
    userId: string,
    data: { name?: string; email?: string }
  ): Promise<IUser> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await UserModel.findByEmail(data.email);
      if (existingUser) {
        throw AppError.conflict('Email is already in use by another account');
      }
    }

    const updated = await UserModel.update(userId, data);
    if (!updated) {
      throw AppError.internal('Failed to update profile');
    }

    eventEmitter.emit(EVENT_TYPES.USER_UPDATED, { userId, changes: Object.keys(data) });

    logger.info('User profile updated', { userId });

    return updated;
  }

  static async getUsers(
    params: IPaginationParams = {},
    adminUserId: string
  ): Promise<IPaginatedResponse<IUser>> {
    const admin = await UserModel.findById(adminUserId);
    if (!admin || admin.role !== 'admin') {
      throw AppError.forbidden('Only administrators can list users');
    }

    return UserModel.findAll(params);
  }

  static async getUserStats(userId: string): Promise<{
    totalLinks: number;
    activeLinks: number;
    totalClicks: number;
    totalApiKeys: number;
  }> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const userLinks = await LinkModel.findByUserId(userId, { limit: 1 });
    const totalLinks = userLinks.meta.totalItems;

    const activeLinksResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM links WHERE user_id = $1 AND is_active = true',
      [userId]
    );
    const activeLinks = parseInt(activeLinksResult.rows[0]?.count || '0', 10);

    const linkIdsResult = await query<{ id: string }>(
      'SELECT id FROM links WHERE user_id = $1',
      [userId]
    );
    const linkIds = linkIdsResult.rows.map((r) => r.id);

    let totalClicks = 0;
    if (linkIds.length > 0) {
      const clicksResult = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM click_events WHERE link_id = ANY($1::uuid[])',
        [linkIds]
      );
      totalClicks = parseInt(clicksResult.rows[0]?.count || '0', 10);
    }

    const apiKeys = await ApiKeyModel.findByUserId(userId);
    const totalApiKeys = apiKeys.filter((k) => k.isActive).length;

    return {
      totalLinks,
      activeLinks,
      totalClicks,
      totalApiKeys,
    };
  }

  static async regenerateApiKey(userId: string): Promise<{ apiKey: string }> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const newApiKey = `uk_${randomBytes(24).toString('hex')}`;

    const existingKeys = await ApiKeyModel.findByUserId(userId);
    for (const key of existingKeys) {
      if (key.isActive) {
        await ApiKeyModel.revoke(key.id);
      }
    }

    await ApiKeyModel.create({
      id: uuidv4(),
      userId,
      key: newApiKey,
      name: 'Default API Key',
    });

    await UserModel.update(userId, { apiKey: newApiKey });

    logger.info('API key regenerated', { userId });

    return { apiKey: newApiKey };
  }
}
