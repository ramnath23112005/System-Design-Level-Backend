import { Job } from 'bull';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { CACHE_PREFIXES, EVENT_TYPES } from '@urlshortener/shared';
import { qrGenerationQueue } from './index';
import { LinkModel } from '../models';
import { config } from '../config';
import { eventEmitter } from '../utils/events';
import { logger } from '../utils/logger';
import { cache } from '../utils/cache';
import { s3 } from '../utils/s3';

interface QRGenerationData {
  linkId: string;
  userId: string;
  shortCode: string;
  options?: {
    size?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    format?: 'png' | 'svg';
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  };
}

const DEFAULT_QR_OPTIONS = {
  size: 400,
  margin: 4,
  darkColor: '#000000',
  lightColor: '#ffffff',
  errorCorrectionLevel: 'M' as const,
};

export async function generateQRCode(job: Job<QRGenerationData>): Promise<{ qrCodeUrl: string; linkId: string }> {
  const { linkId, userId, shortCode, options = {} } = job.data;
  logger.info('Processing QR generation', { linkId, jobId: job.id });

  const redirectUrl = `${config.urls.redirectBaseUrl}/${shortCode}`;
  const size = options.size || DEFAULT_QR_OPTIONS.size;
  const margin = options.margin ?? DEFAULT_QR_OPTIONS.margin;
  const darkColor = options.color?.dark || DEFAULT_QR_OPTIONS.darkColor;
  const lightColor = options.color?.light || DEFAULT_QR_OPTIONS.lightColor;
  const format = options.format || 'png';
  const errorCorrectionLevel = options.errorCorrectionLevel || DEFAULT_QR_OPTIONS.errorCorrectionLevel;

  let buffer: Buffer;
  let contentType: string;
  let fileExtension: string;

  try {
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
      buffer = await QRCode.toBuffer(redirectUrl, {
        type: 'png',
        width: size,
        margin,
        color: {
          dark: darkColor,
          light: lightColor,
        },
        errorCorrectionLevel,
      });
      contentType = 'image/png';
      fileExtension = 'png';
    }
  } catch (error) {
    logger.error('QR code generation failed', { linkId, error: (error as Error).message });
    throw new Error(`QR code generation failed: ${(error as Error).message}`);
  }

  const s3Key = `qr-codes/${userId}/${linkId}-${Date.now()}.${fileExtension}`;

  let qrCodeUrl: string;
  try {
    qrCodeUrl = await s3.upload(s3Key, buffer, contentType);
  } catch (error) {
    logger.error('QR code upload failed', { linkId, s3Key, error: (error as Error).message });
    throw new Error(`QR code upload failed: ${(error as Error).message}`);
  }

  if (format === 'png') {
    try {
      await s3.upload(
        s3Key.replace(`.${fileExtension}`, '_thumbnail.png'),
        buffer,
        contentType
      );
    } catch {
      logger.warn('QR thumbnail upload failed, continuing', { linkId });
    }
  }

  const cacheKey = `${CACHE_PREFIXES.QR_CODES}:${linkId}`;
  await cache.set(cacheKey, { qrCodeUrl, linkId, s3Key }, 86400);

  eventEmitter.emit(EVENT_TYPES.QR_CODE_GENERATED, {
    linkId,
    userId,
    qrCodeUrl,
    format,
  });

  logger.info('QR code generated and uploaded', { linkId, format, s3Key });

  return { qrCodeUrl, linkId };
}

export async function regenerateQRCode(job: Job<{ linkId: string }>): Promise<{ qrCodeUrl: string; linkId: string }> {
  const { linkId } = job.data;
  logger.info('Regenerating QR code', { linkId, jobId: job.id });

  const link = await LinkModel.findById(linkId);
  if (!link) {
    throw new Error(`Link not found: ${linkId}`);
  }

  const cacheKey = `${CACHE_PREFIXES.QR_CODES}:${linkId}`;
  const cached = await cache.get<{ qrCodeUrl: string; linkId: string; s3Key: string }>(cacheKey);

  if (cached?.s3Key) {
    try {
      await s3.delete(cached.s3Key);
      logger.debug('Deleted old QR code from storage', { linkId, s3Key: cached.s3Key });
    } catch (error) {
      logger.warn('Failed to delete old QR code', { linkId, error: (error as Error).message });
    }
  }

  await cache.del(cacheKey);

  return generateQRCode(
    new (require('bull').Job)(qrGenerationQueue, {
      id: 'regenerate',
      data: {
        linkId,
        userId: link.userId,
        shortCode: link.shortCode,
      },
    })
  );
}

export function registerQRGenerationProcessor(): void {
  qrGenerationQueue.process('generate', 5, generateQRCode);
  qrGenerationQueue.process('regenerate', 3, regenerateQRCode);

  logger.info('QR generation processor registered');
}
