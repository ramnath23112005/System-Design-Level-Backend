import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    const logData: Record<string, unknown> = {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userId: req.user?.id || 'anonymous',
      contentLength: res.getHeader('content-length') || 0,
    };

    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    if (level === 'error') {
      console.error('[Request]', JSON.stringify(logData));
    } else if (level === 'warn') {
      console.warn('[Request]', JSON.stringify(logData));
    } else {
      console.info('[Request]', JSON.stringify(logData));
    }
  });

  next();
}
