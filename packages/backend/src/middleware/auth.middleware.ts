import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { HTTP_STATUS } from '@urlshortener/shared';

export interface JwtPayload {
  id: string;
  email: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function sendUnauthorized(res: Response, message: string, error: string): void {
  res.status(HTTP_STATUS.UNAUTHORIZED).json({
    success: false,
    data: null,
    message,
    error,
    timestamp: new Date().toISOString(),
  });
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendUnauthorized(res, 'Authentication required', 'Missing or invalid authorization header');
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    sendUnauthorized(res, 'Authentication required', 'Token not provided');
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendUnauthorized(res, 'Token has expired', 'Token expired');
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      sendUnauthorized(res, 'Invalid token', 'Token verification failed');
      return;
    }
    sendUnauthorized(res, 'Authentication failed', 'Unable to authenticate token');
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
  } catch {
    // Silently ignore invalid/expired tokens for optional auth
  }

  next();
}
