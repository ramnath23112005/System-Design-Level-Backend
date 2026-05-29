import { Request, Response } from 'express';
import { HTTP_STATUS, IPaginationParams } from '@urlshortener/shared';
import { LinkService } from '../services/link.service';
import { QRCodeService } from '../services/qr-code.service';
import { LinkModel } from '../models/link.model';
import { logger } from '../utils/logger';

export async function createLink(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;
    const link = await LinkService.createLink(userId, req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: link,
      message: 'Link created successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Create link failed', { error: error.message });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to create link',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function getUserLinks(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;

    const params: IPaginationParams = {};
    if (req.query.page) params.page = parseInt(req.query.page as string, 10);
    if (req.query.limit) params.limit = parseInt(req.query.limit as string, 10);
    if (req.query.sortBy) params.sortBy = req.query.sortBy as string;
    if (req.query.sortOrder) params.sortOrder = req.query.sortOrder as 'asc' | 'desc';

    const result = await LinkService.getUserLinks(userId, params);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
      message: 'Links retrieved successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get user links failed', { error: error.message });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to retrieve links',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function getLink(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;
    const linkId = req.params.id;

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
        message: 'You do not have permission to view this link',
        error: 'Access denied',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: link,
      message: 'Link retrieved successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get link failed', { error: error.message, linkId: req.params.id });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to retrieve link',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function updateLink(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;
    const linkId = req.params.id;

    const link = await LinkService.updateLink(linkId, userId, req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: link,
      message: 'Link updated successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Update link failed', { error: error.message, linkId: req.params.id });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to update link',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function deleteLink(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;
    const linkId = req.params.id;

    await LinkService.deleteLink(linkId, userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: null,
      message: 'Link deleted successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Delete link failed', { error: error.message, linkId: req.params.id });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to delete link',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function getLinkAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;
    const linkId = req.params.id;
    const period = req.query.period as string | undefined;

    const analytics = await LinkService.getLinkAnalytics(linkId, userId, period);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: analytics,
      message: 'Analytics retrieved successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get link analytics failed', { error: error.message, linkId: req.params.id });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to retrieve analytics',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function getQRCode(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;
    const linkId = req.params.id;

    const result = await QRCodeService.getQRCode(linkId, userId);

    if (!result) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        data: null,
        message: 'No QR code found for this link',
        error: 'QR code not generated yet',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
      message: 'QR code retrieved successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get QR code failed', { error: error.message, linkId: req.params.id });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to retrieve QR code',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function generateQRCode(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any).userId || req.user!.id;
    const linkId = req.params.id;

    const { size, format, margin, color, errorCorrectionLevel } = req.body;

    const options: any = {};
    if (size !== undefined) options.size = size;
    if (format !== undefined) options.format = format;
    if (margin !== undefined) options.margin = margin;
    if (color !== undefined) options.color = color;
    if (errorCorrectionLevel !== undefined) options.errorCorrectionLevel = errorCorrectionLevel;

    const result = await QRCodeService.generateQRCode(linkId, userId, options);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: result,
      message: 'QR code generated successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Generate QR code failed', { error: error.message, linkId: req.params.id });

    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to generate QR code',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}
