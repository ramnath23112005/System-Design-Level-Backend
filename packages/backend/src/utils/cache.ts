import Redis from 'ioredis';
import { CACHE_PREFIXES } from '@urlshortener/shared';
import { config } from '../config';
import { logger } from './logger';

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on('error', (err: Error) => {
      logger.error('Redis connection error', { error: err.message });
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Reconnecting to Redis...');
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }
  return redisClient;
}

function prefixed(key: string): string {
  const prefix = Object.values(CACHE_PREFIXES).find((p) => key.startsWith(p));
  return prefix ? `${prefix}:${key}` : key;
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = getRedisClient();
      const data = await client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error('Cache get error', { key, error: (error as Error).message });
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds: number = 3600): Promise<void> {
    try {
      const client = getRedisClient();
      const serialized = JSON.stringify(value);
      await client.setex(key, ttlSeconds, serialized);
    } catch (error) {
      logger.error('Cache set error', { key, error: (error as Error).message });
    }
  },

  async del(key: string): Promise<void> {
    try {
      const client = getRedisClient();
      await client.del(key);
    } catch (error) {
      logger.error('Cache del error', { key, error: (error as Error).message });
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      const client = getRedisClient();
      const result = await client.exists(key);
      return result === 1;
    } catch {
      return false;
    }
  },

  async keys(pattern: string): Promise<string[]> {
    try {
      const client = getRedisClient();
      return await client.keys(pattern);
    } catch (error) {
      logger.error('Cache keys error', { pattern, error: (error as Error).message });
      return [];
    }
  },

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const client = getRedisClient();
      const results = await client.mget(keys);
      return results.map((data) => {
        if (!data) return null;
        try {
          return JSON.parse(data) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      logger.error('Cache mget error', { keys, error: (error as Error).message });
      return keys.map(() => null);
    }
  },

  async cacheWrap<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const value = await fetchFn();
    await this.set(key, value, ttlSeconds);
    return value;
  },

  async delPattern(pattern: string): Promise<void> {
    try {
      const client = getRedisClient();
      const stream = client.scanStream({ match: pattern, count: 100 });
      const pipeline = client.pipeline();
      let keysBatch: string[] = [];

      (stream as any).on('data', (keys: string[]) => {
        if (keys.length > 0) {
          keysBatch = keysBatch.concat(keys);
          if (keysBatch.length >= 100) {
            keysBatch.forEach((k) => pipeline.del(k));
            pipeline.exec();
            keysBatch = [];
          }
        }
      });

      await new Promise<void>((resolve, reject) => {
        (stream as any).on('end', async () => {
          if (keysBatch.length > 0) {
            keysBatch.forEach((k) => pipeline.del(k));
            await pipeline.exec();
          }
          resolve();
        });
        (stream as any).on('error', reject);
      });
    } catch (error) {
      logger.error('Cache delPattern error', { pattern, error: (error as Error).message });
    }
  },

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const client = getRedisClient();
      const count = await client.incr(key);
      if (ttlSeconds && count === 1) {
        await client.expire(key, ttlSeconds);
      }
      return count;
    } catch (error) {
      logger.error('Cache increment error', { key, error: (error as Error).message });
      return 0;
    }
  },

  async ping(): Promise<boolean> {
    try {
      const client = getRedisClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  },

  async flushAll(): Promise<void> {
    try {
      const client = getRedisClient();
      await client.flushall();
      logger.info('Cache flushed');
    } catch (error) {
      logger.error('Cache flushAll error', { error: (error as Error).message });
    }
  },

  async quit(): Promise<void> {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis connection closed gracefully');
    }
  },

  getClient(): Redis {
    return getRedisClient();
  },
};
