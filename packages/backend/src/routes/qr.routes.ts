import { Router } from 'express';
import { z } from 'zod';
import { Request, Response } from 'express';
import { authenticate, apiLimiter } from '../middleware';
import { HTTP_STATUS } from '@urlshortener/shared';
import { QRCodeService } from '../services/qr-code.service';
import { logger } from '../utils/logger';

const router = Router();

const generateQRSchema = z.object({
  body: z.object({
    size: z.number().int().positive().max(2000).optional(),
    format: z.enum(['png', 'svg']).optional(),
    margin: z.number().int().min(0).max(50).optional(),
    color: z.object({
      dark: z.string().optional(),
      light: z.string().optional(),
    }).optional(),
    errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).optional(),
  }),
});

router.get('/:linkId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).userId || req.user!.id;
    const result = await QRCodeService.getQRCode(req.params.linkId, userId);
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
    logger.error('Failed to get QR code', { error: error.message, linkId: req.params.linkId });
    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to get QR code',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.post('/:linkId', authenticate, apiLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = generateQRSchema.safeParse(req);
    const options = parsed.success ? parsed.data.body : {};

    const userId = (req.user as any).userId || req.user!.id;
    const result = await QRCodeService.generateQRCode(req.params.linkId, userId, options);
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: result,
      message: 'QR code generated successfully',
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to generate QR code', { error: error.message, linkId: req.params.linkId });
    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to generate QR code',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.delete('/:linkId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).userId || req.user!.id;
    await QRCodeService.deleteQRCode(req.params.linkId, userId);
    res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (error: any) {
    logger.error('Failed to delete QR code', { error: error.message, linkId: req.params.linkId });
    const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      data: null,
      message: error.message || 'Failed to delete QR code',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
