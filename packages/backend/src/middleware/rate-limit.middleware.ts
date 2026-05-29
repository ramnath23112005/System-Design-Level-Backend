import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { RATE_LIMIT, HTTP_STATUS } from '@urlshortener/shared';

function keyGenerator(req: Request): string {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}

function createRateLimitHandler(message: string) {
  return (_req: Request, res: any): void => {
    const retryAfter = Math.ceil(
      (RATE_LIMIT.WINDOW_MS - (Date.now() % RATE_LIMIT.WINDOW_MS)) / 1000
    );
    res.set('Retry-After', retryAfter.toString());
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      data: null,
      message,
      error: 'Rate limit exceeded',
      timestamp: new Date().toISOString(),
    });
  };
}

export const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: createRateLimitHandler('Too many requests, please try again later'),
});

export const authLimiter = rateLimit({
  windowMs: RATE_LIMIT.AUTH_WINDOW_MS,
  max: RATE_LIMIT.AUTH_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: createRateLimitHandler('Too many authentication attempts, please try again later'),
});

export const shortenerLimiter = rateLimit({
  windowMs: RATE_LIMIT.CREATE_LINK_WINDOW_MS,
  max: RATE_LIMIT.CREATE_LINK_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: createRateLimitHandler('Too many links created, please try again later'),
});
