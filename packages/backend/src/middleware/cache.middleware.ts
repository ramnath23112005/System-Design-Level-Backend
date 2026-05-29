import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { CACHE_PREFIXES } from '@urlshortener/shared';
import { config } from '../config';

let redisClient: Redis | null = null;

async function getRedisClient(): Promise<Redis> {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      keyPrefix: `${CACHE_PREFIXES.LINKS}:`,
      lazyConnect: true,
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on('error', (err: Error) => {
      console.error('[Cache] Redis connection error:', err.message);
    });
  }

  return redisClient;
}

export function cacheResponse(durationSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    const cacheKey = `response:${req.originalUrl || req.url}`;

    try {
      const client = await getRedisClient();
      const cached = await client.get(cacheKey);

      if (cached) {
        const data = JSON.parse(cached);
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-TTL', `${durationSeconds}`);
        res.status(data.statusCode).json(data.body);
        return;
      }

      const originalJson = res.json.bind(res);
      res.json = function (body: unknown): Response {
        const entry = JSON.stringify({
          body,
          statusCode: res.statusCode,
          timestamp: Date.now(),
        });

        client.setex(cacheKey, durationSeconds, entry).catch(() => {});
        res.set('X-Cache', 'MISS');

        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('[Cache] Middleware error:', error);
      next();
    }
  };
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const keys = await client.keys(`*${pattern}*`);

    if (keys.length > 0) {
      await client.del(...keys);
      console.info(`[Cache] Invalidated ${keys.length} keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    console.error('[Cache] Invalidation error:', error);
  }
}

export async function clearCache(): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.flushdb();
    console.info('[Cache] Full cache cleared');
  } catch (error) {
    console.error('[Cache] Clear error:', error);
  }
}
