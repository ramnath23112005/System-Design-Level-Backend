import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import {
  ILink,
  ICreateLinkInput,
  IUpdateLinkInput,
  IPaginationParams,
  IPaginatedResponse,
  IAnalyticsSummary,
  EVENT_TYPES,
  SHORT_CODE_LENGTH,
  CACHE_PREFIXES,
} from '@urlshortener/shared';
import { isValidUrl, isValidCustomAlias, generateShortCode } from '@urlshortener/shared';
import { LinkModel, ClickEventModel } from '../models';
import { config } from '../config';
import { AppError } from '../middleware/error-handler.middleware';
import { logger } from '../utils/logger';
import { eventEmitter } from '../utils/events';
import { cache } from '../utils/cache';

export class LinkService {
  static async createLink(userId: string, input: ICreateLinkInput): Promise<ILink> {
    if (!isValidUrl(input.originalUrl)) {
      throw AppError.badRequest('Invalid URL provided. Must be a valid http or https URL.');
    }

    let shortCode: string;
    let passwordHash: string | undefined;

    if (input.customAlias) {
      if (!isValidCustomAlias(input.customAlias)) {
        throw AppError.badRequest(
          'Custom alias must be 4-20 characters and contain only letters, numbers, hyphens, or underscores'
        );
      }

      const existing = await LinkModel.findByCustomAlias(input.customAlias);
      if (existing) {
        throw AppError.conflict('This custom alias is already taken');
      }
      shortCode = input.customAlias;
    } else {
      let attempts = 0;
      do {
        shortCode = generateShortCode(SHORT_CODE_LENGTH);
        const existing = await LinkModel.findByShortCode(shortCode);
        if (!existing) break;
        attempts++;
      } while (attempts < 5);

      if (attempts >= 5) {
        shortCode = nanoid(SHORT_CODE_LENGTH + 2);
      }
    }

    if (input.password) {
      if (input.password.length < 4) {
        throw AppError.badRequest('Password must be at least 4 characters');
      }
      passwordHash = await bcrypt.hash(input.password, 10);
    }

    const link = await LinkModel.create({
      id: uuidv4(),
      userId,
      input,
      shortCode,
      passwordHash,
    });

    const cacheKey = `${CACHE_PREFIXES.LINKS}:${shortCode}`;
    await cache.set(cacheKey, link, 3600);

    eventEmitter.emit(EVENT_TYPES.LINK_CREATED, {
      linkId: link.id,
      userId,
      shortCode: link.shortCode,
    });

    logger.info('Link created', {
      linkId: link.id,
      userId,
      shortCode: link.shortCode,
    });

    return link;
  }

  static async getLinkByShortCode(code: string): Promise<ILink> {
    const cacheKey = `${CACHE_PREFIXES.LINKS}:${code}`;
    const cached = await cache.get<ILink>(cacheKey);
    if (cached) {
      if (cached.expiresAt && new Date(cached.expiresAt) <= new Date()) {
        throw AppError.badRequest('This link has expired');
      }
      if (!cached.isActive) {
        throw AppError.badRequest('This link is no longer active');
      }
      return cached;
    }

    const link = await LinkModel.findByShortCode(code);
    if (!link) {
      throw AppError.notFound('Link not found');
    }

    if (link.expiresAt && new Date(link.expiresAt) <= new Date()) {
      throw AppError.badRequest('This link has expired');
    }

    if (!link.isActive) {
      throw AppError.badRequest('This link is no longer active');
    }

    await cache.set(cacheKey, link, 3600);
    return link;
  }

  static async getUserLinks(
    userId: string,
    params: IPaginationParams = {}
  ): Promise<IPaginatedResponse<ILink>> {
    return LinkModel.findByUserId(userId, params);
  }

  static async updateLink(
    linkId: string,
    userId: string,
    input: IUpdateLinkInput
  ): Promise<ILink> {
    const link = await LinkModel.findById(linkId);
    if (!link) {
      throw AppError.notFound('Link not found');
    }

    if (link.userId !== userId) {
      throw AppError.forbidden('You do not have permission to update this link');
    }

    if (input.originalUrl !== undefined && !isValidUrl(input.originalUrl)) {
      throw AppError.badRequest('Invalid URL provided');
    }

    const updateData: IUpdateLinkInput = { ...input };

    if (input.password !== undefined) {
      if (input.password === null) {
        updateData.password = null;
      } else {
        if (input.password.length < 4) {
          throw AppError.badRequest('Password must be at least 4 characters');
        }
        updateData.password = await bcrypt.hash(input.password, 10);
      }
    }

    const updated = await LinkModel.update(linkId, updateData);
    if (!updated) {
      throw AppError.internal('Failed to update link');
    }

    const cacheKey = `${CACHE_PREFIXES.LINKS}:${link.shortCode}`;
    await cache.del(cacheKey);
    await cache.del(`${CACHE_PREFIXES.LINKS}:${linkId}`);

    logger.info('Link updated', { linkId, userId });

    return updated;
  }

  static async deleteLink(linkId: string, userId: string): Promise<void> {
    const link = await LinkModel.findById(linkId);
    if (!link) {
      throw AppError.notFound('Link not found');
    }

    if (link.userId !== userId) {
      throw AppError.forbidden('You do not have permission to delete this link');
    }

    await LinkModel.softDelete(linkId);

    const cacheKey = `${CACHE_PREFIXES.LINKS}:${link.shortCode}`;
    await cache.del(cacheKey);
    await cache.del(`${CACHE_PREFIXES.LINKS}:${linkId}`);

    eventEmitter.emit(EVENT_TYPES.LINK_DELETED, {
      linkId,
      userId,
      shortCode: link.shortCode,
    });

    logger.info('Link deleted', { linkId, userId });
  }

  static async resolveLink(code: string, clickData?: {
    ipAddress?: string;
    userAgent?: string;
    referer?: string;
    country?: string;
    city?: string;
    browser?: string;
    browserVersion?: string;
    os?: string;
    osVersion?: string;
    deviceType?: string;
    deviceModel?: string;
    isMobile?: boolean;
    isTablet?: boolean;
    isDesktop?: boolean;
  }): Promise<{ originalUrl: string; passwordRequired: boolean }> {
    const link = await this.getLinkByShortCode(code);

    if (link.password) {
      return { originalUrl: link.originalUrl, passwordRequired: true };
    }

    if (clickData) {
      const clickEventData = {
        id: uuidv4(),
        linkId: link.id,
        ...clickData,
      };

      process.nextTick(async () => {
        try {
          await ClickEventModel.create(clickEventData);

          eventEmitter.emit(EVENT_TYPES.LINK_CLICKED, {
            linkId: link.id,
            shortCode: link.shortCode,
            ipAddress: clickData.ipAddress,
            country: clickData.country,
          });
        } catch (error) {
          logger.error('Failed to record click event', {
            linkId: link.id,
            error: (error as Error).message,
          });
        }
      });
    }

    return { originalUrl: link.originalUrl, passwordRequired: false };
  }

  static async resolvePasswordProtectedLink(
    code: string,
    password: string,
    clickData?: Record<string, unknown>
  ): Promise<{ originalUrl: string }> {
    const link = await this.getLinkByShortCode(code);

    if (!link.password) {
      throw AppError.badRequest('This link does not require a password');
    }

    const isPasswordValid = await bcrypt.compare(password, link.password);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid password');
    }

    if (clickData) {
      process.nextTick(async () => {
        try {
          await ClickEventModel.create({
            id: uuidv4(),
            linkId: link.id,
            ...(clickData as any),
          });

          eventEmitter.emit(EVENT_TYPES.LINK_CLICKED, {
            linkId: link.id,
            shortCode: link.shortCode,
            ipAddress: clickData.ipAddress,
          });
        } catch (error) {
          logger.error('Failed to record click event for password-protected link', {
            linkId: link.id,
            error: (error as Error).message,
          });
        }
      });
    }

    return { originalUrl: link.originalUrl };
  }

  static async getLinkAnalytics(
    linkId: string,
    userId: string,
    period?: string
  ): Promise<IAnalyticsSummary> {
    const link = await LinkModel.findById(linkId);
    if (!link) {
      throw AppError.notFound('Link not found');
    }

    if (link.userId !== userId) {
      throw AppError.forbidden('You do not have permission to view analytics for this link');
    }

    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}:${linkId}${period ? `:${period}` : ''}`;
    const cached = await cache.get<IAnalyticsSummary>(cacheKey);
    if (cached) {
      return cached;
    }

    const analytics = await ClickEventModel.getAnalyticsSummary(linkId);

    await cache.set(cacheKey, analytics, 300);

    return analytics;
  }
}
