import { Router, Request, Response } from 'express';
import { HTTP_STATUS } from '@urlshortener/shared';
import { LinkService } from '../services/link.service';
import { LinkModel } from '../models/link.model';
import { logger } from '../utils/logger';

const router = Router();

router.get('/:code', async (req: Request, res: Response) => {
  const { code } = req.params;

  if (!code || code.length < 3) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      data: null,
      message: 'Link not found',
      error: 'Invalid short code',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || null;
  const referer = req.headers['referer'] || req.headers['referrer'] || null;

  try {
    const link = await LinkModel.findByShortCode(code);

    if (!link) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        data: null,
        message: 'Link not found',
        error: 'No link found for this short code',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (link.expiresAt && new Date(link.expiresAt) <= new Date()) {
      res.status(410).json({
        success: false,
        data: null,
        message: 'This link has expired',
        error: 'Link expired',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!link.isActive) {
      res.status(410).json({
        success: false,
        data: null,
        message: 'This link is no longer active',
        error: 'Link deactivated',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (link.password) {
      const password = req.query.pwd as string | undefined;

      if (!password) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          data: null,
          message: 'This link is password protected',
          error: 'Password required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const bcrypt = await import('bcryptjs');
      const isPasswordValid = await bcrypt.compare(password, link.password);

      if (!isPasswordValid) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          data: null,
          message: 'Invalid password',
          error: 'Incorrect password',
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    process.nextTick(async () => {
      try {
        const { v4: uuidv4 } = await import('uuid');
        const { ClickEventModel } = await import('../models/click-event.model');
        const { eventEmitter } = await import('../utils/events');
        const { EVENT_TYPES } = await import('@urlshortener/shared');

        const clickData = {
          id: uuidv4(),
          linkId: link.id,
          ipAddress,
          userAgent,
          referer,
        };

        await ClickEventModel.create(clickData);
        await LinkModel.incrementClickCount(link.id);
        eventEmitter.emit(EVENT_TYPES.LINK_CLICKED, {
          linkId: link.id,
          shortCode: link.shortCode,
          ipAddress,
        });
      } catch (err) {
        logger.error('Failed to record click event', {
          linkId: link.id,
          shortCode: code,
          error: (err as Error).message,
        });
      }
    });

    res.redirect(302, link.originalUrl);
  } catch (error: any) {
    if (error.statusCode === HTTP_STATUS.NOT_FOUND) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        data: null,
        message: 'Link not found',
        error: 'No link found for this short code',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.error('Redirect failed', {
      shortCode: code,
      error: error.message,
    });

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      data: null,
      message: 'Failed to process redirect',
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
