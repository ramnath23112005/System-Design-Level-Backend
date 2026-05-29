import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '@urlshortener/shared';
import { config } from '../config';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string = 'Bad request'): AppError {
    return new AppError(message, HTTP_STATUS.BAD_REQUEST);
  }

  static unauthorized(message: string = 'Unauthorized'): AppError {
    return new AppError(message, HTTP_STATUS.UNAUTHORIZED);
  }

  static forbidden(message: string = 'Forbidden'): AppError {
    return new AppError(message, HTTP_STATUS.FORBIDDEN);
  }

  static notFound(message: string = 'Resource not found'): AppError {
    return new AppError(message, HTTP_STATUS.NOT_FOUND);
  }

  static conflict(message: string = 'Resource already exists'): AppError {
    return new AppError(message, HTTP_STATUS.CONFLICT);
  }

  static tooManyRequests(message: string = 'Too many requests'): AppError {
    return new AppError(message, HTTP_STATUS.TOO_MANY_REQUESTS);
  }

  static internal(message: string = 'Internal server error'): AppError {
    return new AppError(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, true);
  }
}

function logError(err: Error, req?: Request): void {
  const logData: Record<string, unknown> = {
    message: err.message,
    name: err.name,
    stack: config.app.nodeEnv === 'development' || config.app.nodeEnv === 'staging' ? err.stack : undefined,
  };

  if (req) {
    logData.method = req.method;
    logData.url = req.originalUrl || req.url;
    logData.ip = req.ip;
    logData.requestId = (req as any).requestId;
  }

  if (err instanceof AppError && err.isOperational) {
    console.warn('[Operational Error]', JSON.stringify(logData));
  } else {
    console.error('[Unexpected Error]', JSON.stringify(logData));
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logError(err, req);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      data: null,
      message: err.message,
      error: config.app.nodeEnv === 'development' ? err.stack : err.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      data: null,
      message: 'Invalid or expired token',
      error: 'Authentication failed',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (err.name === 'ValidationError') {
    res.status(HTTP_STATUS.UNPROCESSABLE).json({
      success: false,
      data: null,
      message: err.message,
      error: 'Validation error',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    data: null,
    message: 'Internal server error',
    error: config.app.nodeEnv === 'development' ? err.message : 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  });
}
