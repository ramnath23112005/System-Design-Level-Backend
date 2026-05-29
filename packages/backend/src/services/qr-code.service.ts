import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { CACHE_PREFIXES, EVENT_TYPES } from '@urlshortener/shared';
import { LinkModel } from '../models';
import { config } from '../config';
import { AppError } from '../middleware/error-handler.middleware';
import { logger } from '../utils/logger';
import { cache } from '../utils/cache';
import { s3 } from '../utils/s3';
import { eventEmitter } from '../utils/events';

export interface QRCodeOptions {
  size?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  format?: 'png' | 'svg';
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export class QRCodeService {
  static async generateQRCode(
    linkId: string,
    userId: string,
    options: QRCodeOptions = {}
  ): Promise<{ qrCodeUrl: string; linkId: string }> {
    const link = await LinkModel.findById(linkId);
    if (!link) {
      throw AppError.notFound('Link not found');
    }

    if (link.userId !== userId) {
      throw AppError.forbidden('You do not have permission to generate QR codes for this link');
    }

    const redirectUrl = `${config.urls.redirectBaseUrl}/${link.shortCode}`;
    const format = options.format || 'png';
    const size = options.size || 400;
    const margin = options.margin ?? 4;
    const darkColor = options.color?.dark || '#000000';
    const lightColor = options.color?.light || '#ffffff';
    const errorCorrectionLevel = options.errorCorrectionLevel || 'M';

    let buffer: Buffer;
    let contentType: string;
    let fileExtension: string;

    if (format === 'svg') {
      const svgString = await QRCode.toString(redirectUrl, {
        type: 'svg',
        margin,
        color: {
          dark: darkColor,
          light: lightColor,
        },
        errorCorrectionLevel,
      });
      buffer = Buffer.from(svgString);
      contentType = 'image/svg+xml';
      fileExtension = 'svg';
    } else {
      const pngBuffer = await QRCode.toBuffer(redirectUrl, {
        type: 'png',
        width: size,
        margin,
        color: {
          dark: darkColor,
          light: lightColor,
        },
        errorCorrectionLevel,
      });
      buffer = pngBuffer;
      contentType = 'image/png';
      fileExtension = 'png';
    }

    const s3Key = `qr-codes/${userId}/${linkId}-${Date.now()}.${fileExtension}`;

    let qrCodeUrl: string;
    try {
      qrCodeUrl = await s3.upload(s3Key, buffer, contentType);
    } catch (error) {
      logger.error('Failed to upload QR code to S3', {
        linkId,
        error: (error as Error).message,
      });
      throw AppError.internal('Failed to upload QR code image');
    }

    const cacheKey = `${CACHE_PREFIXES.QR_CODES}:${linkId}`;
    await cache.set(cacheKey, { qrCodeUrl, linkId, s3Key }, 86400);

    eventEmitter.emit(EVENT_TYPES.QR_CODE_GENERATED, {
      linkId,
      userId,
      qrCodeUrl,
      format,
    });

    logger.info('QR code generated', { linkId, userId, format });

    return { qrCodeUrl, linkId };
  }

  static async getQRCode(
    linkId: string,
    userId: string
  ): Promise<{ qrCodeUrl: string } | null> {
    const link = await LinkModel.findById(linkId);
    if (!link) {
      throw AppError.notFound('Link not found');
    }

    if (link.userId !== userId) {
      throw AppError.forbidden('You do not have permission to view this QR code');
    }

    const cacheKey = `${CACHE_PREFIXES.QR_CODES}:${linkId}`;
    const cached = await cache.get<{ qrCodeUrl: string; linkId: string; s3Key: string }>(cacheKey);
    if (cached) {
      return { qrCodeUrl: cached.qrCodeUrl };
    }

    return null;
  }

  static async deleteQRCode(linkId: string, userId: string): Promise<void> {
    const link = await LinkModel.findById(linkId);
    if (!link) {
      throw AppError.notFound('Link not found');
    }

    if (link.userId !== userId) {
      throw AppError.forbidden('You do not have permission to delete this QR code');
    }

    const cacheKey = `${CACHE_PREFIXES.QR_CODES}:${linkId}`;
    const cached = await cache.get<{ qrCodeUrl: string; linkId: string; s3Key: string }>(cacheKey);

    if (cached?.s3Key) {
      try {
        await s3.delete(cached.s3Key);
      } catch (error) {
        logger.error('Failed to delete QR code from S3', {
          linkId,
          s3Key: cached.s3Key,
          error: (error as Error).message,
        });
      }
    }

    await cache.del(cacheKey);

    logger.info('QR code deleted', { linkId, userId });
  }
}
