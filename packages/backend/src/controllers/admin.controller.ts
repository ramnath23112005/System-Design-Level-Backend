import { Request, Response } from 'express';
import { HTTP_STATUS } from '@urlshortener/shared';
import { AdminService } from '../services/admin.service';
import { UserService } from '../services/user.service';
import { logger } from '../utils/logger';

function sanitizeUser(user: { passwordHash?: string; [key: string]: any }) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function getSystemStats(_req: Request, res: Response): Promise<void> {
  try {
    const stats = await AdminService.getSystemStats();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: stats,
      message: 'System stats retrieved successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get system stats failed', { error: error.message });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to retrieve system stats',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function getRecentActivity(_req: Request, res: Response): Promise<void> {
  try {
    const activity = await AdminService.getRecentActivity();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: activity,
      message: 'Recent activity retrieved successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get recent activity failed', { error: error.message });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to retrieve recent activity',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const adminUserId = (req.user as any).userId || req.user!.id;

    const params: any = {};
    if (req.query.page) params.page = parseInt(req.query.page as string, 10);
    if (req.query.limit) params.limit = parseInt(req.query.limit as string, 10);
    if (req.query.sortBy) params.sortBy = req.query.sortBy as string;
    if (req.query.sortOrder) params.sortOrder = req.query.sortOrder as 'asc' | 'desc';

    const users = await UserService.getUsers(params, adminUserId);

    const sanitized = {
      ...users,
      data: users.data.map(sanitizeUser),
    };

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: sanitized,
      message: 'Users retrieved successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get users failed', { error: error.message });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to retrieve users',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function manageUser(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { action } = req.body;

    const user = await AdminService.manageUser(userId, action);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: sanitizeUser(user),
      message: `User ${action}d successfully`,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Manage user failed', { error: error.message, targetUserId: req.params.userId });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to manage user',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function getSystemHealth(_req: Request, res: Response): Promise<void> {
  try {
    const health = await AdminService.getSystemHealth();

    const statusCode = health.database.status === 'healthy' && health.redis.status === 'healthy'
      ? HTTP_STATUS.OK
      : HTTP_STATUS.SERVICE_UNAVAILABLE;

    res.status(statusCode).json({
      success: true,
      data: health,
      message: 'System health check completed',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get system health failed', { error: error.message });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to check system health',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function getLogs(req: Request, res: Response): Promise<void> {
  try {
    const level = (req.query.level as string) || 'all';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    const logs = await AdminService.getLogs(level, limit);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: logs,
      message: 'Logs retrieved successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get logs failed', { error: error.message });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to retrieve logs',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}
