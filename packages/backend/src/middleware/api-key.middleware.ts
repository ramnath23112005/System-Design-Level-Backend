import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '@urlshortener/shared';
import { ApiKeyModel } from '../models/api-key.model';
import { UserModel } from '../models/user.model';
import { authenticate } from './auth.middleware';

export async function authenticateApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!apiKey) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      data: null,
      message: 'API key required',
      error: 'Missing X-API-Key header',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const keyRecord = await ApiKeyModel.findByKey(apiKey);

    if (!keyRecord) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        data: null,
        message: 'Invalid API key',
        error: 'API key not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!keyRecord.isActive) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        data: null,
        message: 'API key is revoked',
        error: 'API key inactive',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (keyRecord.expiresAt && new Date() > new Date(keyRecord.expiresAt)) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        data: null,
        message: 'API key has expired',
        error: 'API key expired',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const user = await UserModel.findById(keyRecord.userId);

    if (!user || !user.isActive) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        data: null,
        message: 'User account not found or inactive',
        error: 'User not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    req.user = { id: user.id, email: user.email, role: user.role };

    ApiKeyModel.recordUsage(keyRecord.id).catch((err) => {
      console.error('Failed to record API key usage:', err);
    });

    next();
  } catch (error) {
    next(error);
  }
}

export async function authenticateApiKeyOrJwt(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    authenticate(req, res, next);
    return;
  }

  if (apiKey) {
    return authenticateApiKey(req, res, next);
  }

  res.status(HTTP_STATUS.UNAUTHORIZED).json({
    success: false,
    data: null,
    message: 'Authentication required',
    error: 'Provide either Bearer token or X-API-Key header',
    timestamp: new Date().toISOString(),
  });
}
