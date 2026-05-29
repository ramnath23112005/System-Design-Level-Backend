import { Job } from 'bull';
import { CACHE_PREFIXES } from '@urlshortener/shared';
import { analyticsProcessingQueue } from './index';
import { query } from '../database';
import { logger } from '../utils/logger';
import { cache } from '../utils/cache';
import { config } from '../config';

interface AggregationData {
  linkId: string;
  period?: string;
}

export async function aggregateHourlyAnalytics(job: Job<AggregationData>): Promise<void> {
  const { linkId } = job.data;
  logger.info('Aggregating hourly analytics', { linkId, jobId: job.id });

  try {
    await query(
      `INSERT INTO analytics_summaries (link_id, period, period_start, total_clicks, unique_visitors, created_at)
       SELECT
         $1,
         'hourly',
         DATE_TRUNC('hour', $2::timestamp),
         COUNT(*) as total_clicks,
         COUNT(DISTINCT ip_address) as unique_visitors,
         NOW()
       FROM click_events
       WHERE link_id = $1
         AND created_at >= DATE_TRUNC('hour', $2::timestamp)
         AND created_at < DATE_TRUNC('hour', $2::timestamp) + INTERVAL '1 hour'
       ON CONFLICT (link_id, period, period_start)
       DO UPDATE SET
         total_clicks = EXCLUDED.total_clicks,
         unique_visitors = EXCLUDED.unique_visitors,
         updated_at = NOW()`,
      [linkId, new Date()]
    );

    await cache.del(`${CACHE_PREFIXES.ANALYTICS}:${linkId}`);
    await cache.delPattern(`${CACHE_PREFIXES.ANALYTICS}:${linkId}:*`);

    logger.debug('Hourly analytics aggregated', { linkId });
  } catch (error) {
    logger.error('Hourly analytics aggregation error', { linkId, error: (error as Error).message });
    throw error;
  }
}

export async function aggregateDailyAnalytics(job: Job<AggregationData>): Promise<void> {
  const { linkId, period } = job.data;
  logger.info('Aggregating daily analytics', { linkId, jobId: job.id });

  const targetDate = period ? new Date(period) : new Date();

  try {
    const browserStats = await query(
      `SELECT browser, COUNT(*) as count
       FROM click_events
       WHERE link_id = $1
         AND created_at >= DATE_TRUNC('day', $2::timestamp)
         AND created_at < DATE_TRUNC('day', $2::timestamp) + INTERVAL '1 day'
         AND browser IS NOT NULL
       GROUP BY browser`,
      [linkId, targetDate]
    );

    const countryStats = await query(
      `SELECT country, COUNT(*) as count
       FROM click_events
       WHERE link_id = $1
         AND created_at >= DATE_TRUNC('day', $2::timestamp)
         AND created_at < DATE_TRUNC('day', $2::timestamp) + INTERVAL '1 day'
         AND country IS NOT NULL
       GROUP BY country`,
      [linkId, targetDate]
    );

    const deviceStats = await query(
      `SELECT device_type, COUNT(*) as count
       FROM click_events
       WHERE link_id = $1
         AND created_at >= DATE_TRUNC('day', $2::timestamp)
         AND created_at < DATE_TRUNC('day', $2::timestamp) + INTERVAL '1 day'
         AND device_type IS NOT NULL
       GROUP BY device_type`,
      [linkId, targetDate]
    );

    await query(
      `UPDATE analytics_summaries
       SET top_browsers = $1::jsonb,
           top_countries = $2::jsonb,
           top_devices = $3::jsonb,
           updated_at = NOW()
       WHERE link_id = $4
         AND period = 'daily'
         AND period_start = DATE_TRUNC('day', $5::timestamp)`,
      [
        JSON.stringify(browserStats.rows),
        JSON.stringify(countryStats.rows),
        JSON.stringify(deviceStats.rows),
        linkId,
        targetDate,
      ]
    );

    await cache.del(`${CACHE_PREFIXES.ANALYTICS}:${linkId}`);
    await cache.delPattern(`${CACHE_PREFIXES.ANALYTICS}:${linkId}:*`);

    logger.debug('Daily analytics aggregated', { linkId });
  } catch (error) {
    logger.error('Daily analytics aggregation error', { linkId, error: (error as Error).message });
    throw error;
  }
}

export async function cleanupStaleData(job: Job): Promise<void> {
  logger.info('Cleaning up stale analytics data', { jobId: job.id });

  const retentionDays = 90;

  try {
    const deletedCount = await query(
      `DELETE FROM click_events WHERE created_at < NOW() - $1::INTERVAL`,
      [`${retentionDays} days`]
    );

    const oldSummariesDeleted = await query(
      `DELETE FROM analytics_summaries
       WHERE period_start < NOW() - INTERVAL '1 year'
         AND period = 'hourly'`
    );

    logger.info('Stale data cleanup completed', {
      clicksDeleted: deletedCount.rowCount,
      summariesDeleted: oldSummariesDeleted.rowCount,
      retentionDays,
    });
  } catch (error) {
    logger.error('Stale data cleanup error', { error: (error as Error).message });
    throw error;
  }
}

export async function materializeLinkAnalytics(job: Job<{ linkId: string }>): Promise<void> {
  const { linkId } = job.data;
  logger.info('Materializing analytics for link', { linkId, jobId: job.id });

  try {
    const existing = await query(
      `SELECT id FROM analytics_summaries
       WHERE link_id = $1 AND period = 'daily' AND period_start = DATE_TRUNC('day', NOW())`,
      [linkId]
    );

    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO analytics_summaries (link_id, period, period_start, total_clicks, unique_visitors, created_at)
         VALUES ($1, 'daily', DATE_TRUNC('day', NOW()), 0, 0, NOW())`,
        [linkId]
      );
    }

    await aggregateDailyAnalytics(
      new (require('bull').Job)(analyticsProcessingQueue, { id: 'materialize', data: { linkId } })
    );

    logger.info('Analytics materialized', { linkId });
  } catch (error) {
    logger.error('Analytics materialization error', { linkId, error: (error as Error).message });
    throw error;
  }
}

export function registerAnalyticsProcessors(): void {
  analyticsProcessingQueue.process('hourly_aggregation', 5, aggregateHourlyAnalytics);
  analyticsProcessingQueue.process('daily_aggregation', 5, aggregateDailyAnalytics);
  analyticsProcessingQueue.process('cleanup', 1, cleanupStaleData);
  analyticsProcessingQueue.process('materialize', 5, materializeLinkAnalytics);

  analyticsProcessingQueue.add(
    'cleanup',
    {},
    {
      repeat: {
        cron: '0 3 * * 0',
      },
      removeOnComplete: true,
      removeOnFail: true,
      jobId: 'cleanup-stale-data',
    }
  );

  logger.info('Analytics processors registered');
}
