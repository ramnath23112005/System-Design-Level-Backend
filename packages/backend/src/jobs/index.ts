import Queue from 'bull';
import { QUEUE_NAMES } from '@urlshortener/shared';
import { config } from '../config';
import { logger } from '../utils/logger';

const redisConfig = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
};

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: {
    age: 3600,
    count: 100,
  },
  removeOnFail: {
    age: 86400,
    count: 50,
  },
};

export const clickTrackingQueue = new Queue(QUEUE_NAMES.CLICK_TRACKING, {
  redis: redisConfig,
  defaultJobOptions,
  settings: {
    lockDuration: 30000,
    stalledInterval: 15000,
    maxStalledCount: 3,
  },
});

export const analyticsProcessingQueue = new Queue(QUEUE_NAMES.ANALYTICS_PROCESSING, {
  redis: redisConfig,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 2,
    removeOnComplete: {
      age: 7200,
      count: 50,
    },
  },
  settings: {
    lockDuration: 60000,
    stalledInterval: 30000,
    maxStalledCount: 2,
  },
});

export const qrGenerationQueue = new Queue(QUEUE_NAMES.QR_GENERATION, {
  redis: redisConfig,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 2,
  },
});

export const emailNotificationsQueue = new Queue(QUEUE_NAMES.EMAIL_NOTIFICATIONS, {
  redis: redisConfig,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5,
    backoff: {
      type: 'exponential' as const,
      delay: 5000,
    },
  },
});

export const cacheInvalidationQueue = new Queue(QUEUE_NAMES.CACHE_INVALIDATION, {
  redis: redisConfig,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 1,
    removeOnComplete: true,
  },
});

const queues = {
  [QUEUE_NAMES.CLICK_TRACKING]: clickTrackingQueue,
  [QUEUE_NAMES.ANALYTICS_PROCESSING]: analyticsProcessingQueue,
  [QUEUE_NAMES.QR_GENERATION]: qrGenerationQueue,
  [QUEUE_NAMES.EMAIL_NOTIFICATIONS]: emailNotificationsQueue,
  [QUEUE_NAMES.CACHE_INVALIDATION]: cacheInvalidationQueue,
};

clickTrackingQueue.on('error', (error: Error) => {
  logger.error('Click tracking queue error', { error: error.message });
});

analyticsProcessingQueue.on('error', (error: Error) => {
  logger.error('Analytics processing queue error', { error: error.message });
});

qrGenerationQueue.on('error', (error: Error) => {
  logger.error('QR generation queue error', { error: error.message });
});

emailNotificationsQueue.on('error', (error: Error) => {
  logger.error('Email notifications queue error', { error: error.message });
});

cacheInvalidationQueue.on('error', (error: Error) => {
  logger.error('Cache invalidation queue error', { error: error.message });
});

Object.values(queues).forEach((q) => {
  q.on('completed', (job) => {
    logger.debug(`Job completed`, { queue: q.name, jobId: job.id, name: job.name });
  });
  q.on('failed', (job, err) => {
    logger.error(`Job failed`, { queue: q.name, jobId: job.id, name: job.name, error: err.message });
  });
  q.on('stalled', (job) => {
    logger.warn(`Job stalled`, { queue: q.name, jobId: job.id });
  });
});

export async function closeAllQueues(): Promise<void> {
  const closePromises = Object.values(queues).map((q) => q.close());
  await Promise.all(closePromises);
  logger.info('All queues closed');
}

export async function pauseAllQueues(): Promise<void> {
  const pausePromises = Object.values(queues).map((q) => q.pause(true));
  await Promise.all(pausePromises);
  logger.info('All queues paused');
}

export default queues;
