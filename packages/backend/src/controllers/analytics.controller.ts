import { Request, Response } from 'express';
import { HTTP_STATUS } from '@urlshortener/shared';
import { AnalyticsService } from '../services/analytics.service';
import { LinkModel } from '../models/link.model';
import { logger } from '../utils/logger';

export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;
    const period = (req.query.period as string) || '7d';

    const stats = await AnalyticsService.getDashboardStats(userId, period);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: stats,
      message: 'Dashboard stats retrieved successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get dashboard stats failed', { error: error.message });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to retrieve dashboard stats',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function getClickAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;
    const { linkId } = req.params;

    const link = await LinkModel.findById(linkId);
    if (!link) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        data: null,
        message: 'Link not found',
        error: 'No link found with this ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (link.userId !== userId) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        data: null,
        message: 'You do not have permission to view analytics for this link',
        error: 'Access denied',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const filters: any = {};
    if (req.query.startDate) filters.startDate = req.query.startDate as string;
    if (req.query.endDate) filters.endDate = req.query.endDate as string;
    if (req.query.country) filters.country = req.query.country as string;
    if (req.query.deviceType) filters.deviceType = req.query.deviceType as string;
    if (req.query.browser) filters.browser = req.query.browser as string;
    if (req.query.page) filters.page = parseInt(req.query.page as string, 10);
    if (req.query.limit) filters.limit = parseInt(req.query.limit as string, 10);

    const result = await AnalyticsService.getClickAnalytics(linkId, filters);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
      message: 'Click analytics retrieved successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get click analytics failed', { error: error.message, linkId: req.params.linkId });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to retrieve click analytics',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function getGeographicData(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;
    const { linkId } = req.params;

    const link = await LinkModel.findById(linkId);
    if (!link) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        data: null,
        message: 'Link not found',
        error: 'No link found with this ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (link.userId !== userId) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        data: null,
        message: 'You do not have permission to view analytics for this link',
        error: 'Access denied',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const data = await AnalyticsService.getGeographicData(linkId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data,
      message: 'Geographic data retrieved successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get geographic data failed', { error: error.message, linkId: req.params.linkId });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to retrieve geographic data',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function getDeviceAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;
    const { linkId } = req.params;

    const link = await LinkModel.findById(linkId);
    if (!link) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        data: null,
        message: 'Link not found',
        error: 'No link found with this ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (link.userId !== userId) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        data: null,
        message: 'You do not have permission to view analytics for this link',
        error: 'Access denied',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const data = await AnalyticsService.getDeviceAnalytics(linkId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data,
      message: 'Device analytics retrieved successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get device analytics failed', { error: error.message, linkId: req.params.linkId });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to retrieve device analytics',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function getClicksOverTime(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;
    const { linkId } = req.params;
    const interval = (req.query.interval as 'hourly' | 'daily' | 'monthly') || 'daily';

    const link = await LinkModel.findById(linkId);
    if (!link) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        data: null,
        message: 'Link not found',
        error: 'No link found with this ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (link.userId !== userId) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        data: null,
        message: 'You do not have permission to view analytics for this link',
        error: 'Access denied',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const data = await AnalyticsService.getClicksOverTime(linkId, interval);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data,
      message: 'Clicks over time retrieved successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get clicks over time failed', { error: error.message, linkId: req.params.linkId });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to retrieve clicks over time',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function getReferrerData(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;
    const { linkId } = req.params;

    const link = await LinkModel.findById(linkId);
    if (!link) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        data: null,
        message: 'Link not found',
        error: 'No link found with this ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (link.userId !== userId) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        data: null,
        message: 'You do not have permission to view analytics for this link',
        error: 'Access denied',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const data = await AnalyticsService.getReferrerData(linkId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data,
      message: 'Referrer data retrieved successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get referrer data failed', { error: error.message, linkId: req.params.linkId });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to retrieve referrer data',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function getRealTimeStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;

    const stats = await AnalyticsService.getRealTimeStats(userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: stats,
      message: 'Real-time stats retrieved successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get real-time stats failed', { error: error.message });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to retrieve real-time stats',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function exportAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;
    const { linkId } = req.params;
    const format = (req.query.format as 'csv' | 'json') || 'json';

    const link = await LinkModel.findById(linkId);
    if (!link) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        data: null,
        message: 'Link not found',
        error: 'No link found with this ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (link.userId !== userId) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        data: null,
        message: 'You do not have permission to export analytics for this link',
        error: 'Access denied',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const data = await AnalyticsService.exportAnalytics(linkId, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${linkId}.csv"`);
      res.status(HTTP_STATUS.OK).send(data);
      return;
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data,
      message: 'Analytics exported successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Export analytics failed', { error: error.message, linkId: req.params.linkId });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to export analytics',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}
