import { Request, Response } from 'express';
import { HTTP_STATUS } from '@urlshortener/shared';
import { UserService } from '../services/user.service';
import { logger } from '../utils/logger';

function sanitizeUser(user: { passwordHash?: string; [key: string]: any }) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;

    const user = await UserService.getProfile(userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: sanitizeUser(user),
      message: 'Profile retrieved successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get profile failed', { error: error.message });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to retrieve profile',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;

    const updateData: { name?: string; email?: string } = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.email !== undefined) updateData.email = req.body.email;

    const user = await UserService.updateProfile(userId, updateData);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: sanitizeUser(user),
      message: 'Profile updated successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Update profile failed', { error: error.message });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to update profile',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function regenerateApiKey(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;

    const result = await UserService.regenerateApiKey(userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
      message: 'API key regenerated successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Regenerate API key failed', { error: error.message });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to regenerate API key',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}
