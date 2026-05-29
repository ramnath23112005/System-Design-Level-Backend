import { Job } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { EVENT_TYPES, CACHE_PREFIXES } from '@urlshortener/shared';
import { clickTrackingQueue, analyticsProcessingQueue } from './index';
import { ClickEventModel, LinkModel } from '../models';
import { eventEmitter } from '../utils/events';
import { logger } from '../utils/logger';
import { cache } from '../utils/cache';
import { parseUserAgent, getGeoFromIP } from '../utils/helpers';

const BATCH_SIZE = 50;
const BATCH_FLUSH_INTERVAL = 5000;

interface ClickData {
  linkId: string;
  shortCode: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  timestamp?: string;
}

let clickBatch: ClickData[] = [];
let batchTimer: NodeJS.Timeout | null = null;

async function flushBatch(): Promise<void> {
  if (clickBatch.length === 0) return;

  const batch = clickBatch.splice(0, BATCH_SIZE);

  try {
    const insertPromises = batch.map(async (data) => {
      const uaInfo = data.userAgent ? parseUserAgent(data.userAgent) : null;
      const geoInfo = data.ipAddress ? getGeoFromIP(data.ipAddress) : null;

      const clickEvent = {
        id: uuidv4(),
        linkId: data.linkId,
        ipAddress: data.ipAddress || '0.0.0.0',
        userAgent: data.userAgent || null,
        referer: data.referer || null,
        country: geoInfo?.country || null,
        city: geoInfo?.city || null,
        latitude: geoInfo?.latitude ?? null,
        longitude: geoInfo?.longitude ?? null,
        browser: uaInfo?.browser || null,
        browserVersion: uaInfo?.browserVersion || null,
        os: uaInfo?.os || null,
        osVersion: uaInfo?.osVersion || null,
        deviceType: uaInfo?.deviceType || null,
        deviceModel: uaInfo?.deviceModel || null,
        isMobile: uaInfo?.isMobile ?? false,
        isTablet: uaInfo?.isTablet ?? false,
        isDesktop: uaInfo?.isDesktop ?? true,
      };

      await ClickEventModel.create(clickEvent);
      await LinkModel.incrementClickCount(data.linkId);

      return { data, clickEvent };
    });

    const results = await Promise.allSettled(insertPromises);

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { data } = result.value;
        const link = await LinkModel.findById(data.linkId);

        eventEmitter.emit(EVENT_TYPES.LINK_CLICKED, {
          linkId: data.linkId,
          shortCode: data.shortCode,
          ipAddress: data.ipAddress,
          country: result.value.clickEvent.country,
          clickCount: link?.click_count || 0,
          userId: data.userId,
          linkExpired: link ? !!(link.expiresAt && new Date(link.expiresAt) <= new Date()) : false,
        });

        await cache.del(`${CACHE_PREFIXES.LINKS}:${data.shortCode}`);
      } else {
        logger.error('Batch click insert failed', { error: result.reason });
      }
    }
  } catch (error) {
    logger.error('Click batch flush error', { error: (error as Error).message });
  }
}

function scheduleBatchFlush(): void {
  if (batchTimer) return;
  batchTimer = setInterval(async () => {
    await flushBatch();
    if (clickBatch.length === 0 && batchTimer) {
      clearInterval(batchTimer);
      batchTimer = null;
    }
  }, BATCH_FLUSH_INTERVAL);
}

function addToBatch(data: ClickData): void {
  clickBatch.push(data);
  if (clickBatch.length >= BATCH_SIZE) {
    flushBatch();
  } else {
    scheduleBatchFlush();
  }
}

export async function processClickEvent(job: Job<ClickData>): Promise<void> {
  const data = job.data;
  logger.debug('Processing click event', { linkId: data.linkId, jobId: job.id });

  addToBatch(data);
}

export async function processClickEventImmediate(job: Job<ClickData>): Promise<void> {
  const data = job.data;
  logger.debug('Processing click event immediately', { linkId: data.linkId, jobId: job.id });

  const uaInfo = data.userAgent ? parseUserAgent(data.userAgent) : null;
  const geoInfo = data.ipAddress ? getGeoFromIP(data.ipAddress) : null;

  const clickEvent = {
    id: uuidv4(),
    linkId: data.linkId,
    ipAddress: data.ipAddress || '0.0.0.0',
    userAgent: data.userAgent || null,
    referer: data.referer || null,
    country: geoInfo?.country || null,
    city: geoInfo?.city || null,
    latitude: geoInfo?.latitude ?? null,
    longitude: geoInfo?.longitude ?? null,
    browser: uaInfo?.browser || null,
    browserVersion: uaInfo?.browserVersion || null,
    os: uaInfo?.os || null,
    osVersion: uaInfo?.osVersion || null,
    deviceType: uaInfo?.deviceType || null,
    deviceModel: uaInfo?.deviceModel || null,
    isMobile: uaInfo?.isMobile ?? false,
    isTablet: uaInfo?.isTablet ?? false,
    isDesktop: uaInfo?.isDesktop ?? true,
  };

  await ClickEventModel.create(clickEvent);
  await LinkModel.incrementClickCount(data.linkId);

  const link = await LinkModel.findById(data.linkId);

  eventEmitter.emit(EVENT_TYPES.LINK_CLICKED, {
    linkId: data.linkId,
    shortCode: data.shortCode,
    ipAddress: data.ipAddress,
    country: geoInfo?.country,
    clickCount: link?.click_count || 0,
    userId: data.userId,
    linkExpired: link ? !!(link.expiresAt && new Date(link.expiresAt) <= new Date()) : false,
  });

  await cache.del(`${CACHE_PREFIXES.LINKS}:${data.shortCode}`);
}

export function registerClickTrackingProcessor(): void {
  clickTrackingQueue.process('click', 10, processClickEvent);
  clickTrackingQueue.process('click_immediate', 5, processClickEventImmediate);

  logger.info('Click tracking processor registered');
}

export async function flushPendingClicks(): Promise<void> {
  await flushBatch();
}

export { clickBatch };
