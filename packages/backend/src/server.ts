import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

import { config, validateConfig } from './config';
import { logger } from './utils/logger';
import { cache } from './utils/cache';
import { testConnection as testDbConnection } from './database';
import { registerEventHandlers } from './events';
import {
  registerClickTrackingProcessor,
  flushPendingClicks,
} from './jobs/click-tracking.job';
import { registerAnalyticsProcessors } from './jobs/analytics-processing.job';
import { registerQRGenerationProcessor } from './jobs/qr-generation.job';
import { registerEmailProcessor } from './jobs/email.job';
import { closeAllQueues, pauseAllQueues } from './jobs';
import { app } from './app';

validateConfig();

registerEventHandlers();

registerClickTrackingProcessor();
registerAnalyticsProcessors();
registerQRGenerationProcessor();
registerEmailProcessor();

let server: ReturnType<typeof app.listen>;

async function start(): Promise<void> {
  try {
    logger.info('Starting server...', {
      environment: config.app.nodeEnv,
      port: config.app.port,
      apiPrefix: config.app.apiPrefix,
    });

    const dbConnected = await testDbConnection();
    if (!dbConnected) {
      logger.warn('Database connection failed on startup, continuing...');
    } else {
      logger.info('Database connection established');
    }

    const redisConnected = await cache.ping();
    if (!redisConnected) {
      logger.warn('Redis connection failed on startup, continuing...');
    } else {
      logger.info('Redis connection established');
    }

    server = app.listen(config.app.port, () => {
      logger.info(`Server started successfully`, {
        port: config.app.port,
        environment: config.app.nodeEnv,
        apiPrefix: config.app.apiPrefix,
        url: `http://localhost:${config.app.port}`,
      });
    });

    server.timeout = 120000;
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server?.close(async () => {
    logger.info('HTTP server closed');

    await pauseAllQueues();

    try {
      await flushPendingClicks();
    } catch (error) {
      logger.error('Error flushing pending clicks', { error: (error as Error).message });
    }

    try {
      await closeAllQueues();
    } catch (error) {
      logger.error('Error closing queues', { error: (error as Error).message });
    }

    try {
      await cache.quit();
    } catch (error) {
      logger.error('Error closing Redis', { error: (error as Error).message });
    }

    logger.info('Graceful shutdown completed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: Error | unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: String(promise),
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    message: error.message,
    name: error.name,
    stack: error.stack,
  });
  process.exit(1);
});

start();

export { app, server };
