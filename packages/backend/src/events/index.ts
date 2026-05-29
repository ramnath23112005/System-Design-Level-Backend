import { EVENT_TYPES, CACHE_PREFIXES } from '@urlshortener/shared';
import { eventEmitter } from '../utils/events';
import { logger } from '../utils/logger';
import { cache } from '../utils/cache';
import { clickTrackingQueue, emailNotificationsQueue } from '../jobs';

const THRESHOLD_MILESTONES = [100, 500, 1000, 5000, 10000, 50000, 100000];

export function registerEventHandlers(): void {
  eventEmitter.on(EVENT_TYPES.LINK_CREATED, async (data: Record<string, unknown>) => {
    try {
      const { userId } = data;
      if (userId) {
        await cache.delPattern(`${CACHE_PREFIXES.LINKS}:user:${userId}:*`);
      }
      logger.info('Event: Link created', { userId: data.userId, linkId: data.linkId });
    } catch (error) {
      logger.error('Event handler error: LINK_CREATED', { error: (error as Error).message, data });
    }
  });

  eventEmitter.on(EVENT_TYPES.LINK_CLICKED, async (data: Record<string, unknown>) => {
    try {
      const { linkId, shortCode, clickCount } = data as Record<string, unknown> & { clickCount?: number };

      await cache.del(`${CACHE_PREFIXES.ANALYTICS}:${linkId}`);
      await cache.delPattern(`${CACHE_PREFIXES.ANALYTICS}:${linkId}:*`);

      if (clickCount && typeof clickCount === 'number') {
        for (const milestone of THRESHOLD_MILESTONES) {
          if (clickCount === milestone) {
            const link = data as Record<string, unknown>;
            await emailNotificationsQueue.add(
              'threshold_reached',
              {
                userId: link.userId,
                linkId: link.linkId,
                shortCode: link.shortCode,
                milestone,
                type: 'threshold_reached',
              },
              { attempts: 3 }
            );
            logger.info('Threshold reached event triggered', { linkId, milestone });
            break;
          }
        }
      }

      const linkData = data as Record<string, unknown>;
      if (linkData.linkExpired || linkData.expired) {
        await emailNotificationsQueue.add(
          'link_expired',
          {
            userId: linkData.userId,
            linkId: linkData.linkId,
            shortCode: linkData.shortCode,
            type: 'link_expired',
          },
          { attempts: 3 }
        );
      }
    } catch (error) {
      logger.error('Event handler error: LINK_CLICKED', { error: (error as Error).message, data });
    }
  });

  eventEmitter.on(EVENT_TYPES.USER_REGISTERED, async (data: Record<string, unknown>) => {
    try {
      await cache.del(`${CACHE_PREFIXES.USERS}:${data.email}`);
      await cache.del(`${CACHE_PREFIXES.USERS}:${data.userId}`);

      await emailNotificationsQueue.add(
        'welcome_email',
        {
          userId: data.userId,
          email: data.email,
          type: 'welcome',
        },
        { attempts: 3 }
      );
      logger.info('Event: User registered - welcome email queued', { userId: data.userId });
    } catch (error) {
      logger.error('Event handler error: USER_REGISTERED', { error: (error as Error).message, data });
    }
  });

  eventEmitter.on(EVENT_TYPES.LINK_EXPIRED, async (data: Record<string, unknown>) => {
    try {
      const { userId, linkId, shortCode } = data;

      await cache.del(`${CACHE_PREFIXES.LINKS}:${shortCode}`);
      await cache.del(`${CACHE_PREFIXES.LINKS}:${linkId}`);

      await emailNotificationsQueue.add(
        'link_expired',
        {
          userId,
          linkId,
          shortCode,
          type: 'link_expired',
        },
        { attempts: 3 }
      );
      logger.info('Event: Link expired - notification queued', { linkId, shortCode });
    } catch (error) {
      logger.error('Event handler error: LINK_EXPIRED', { error: (error as Error).message, data });
    }
  });

  eventEmitter.on(EVENT_TYPES.PASSWORD_RESET_REQUESTED, async (data: Record<string, unknown>) => {
    try {
      await emailNotificationsQueue.add(
        'password_reset',
        {
          userId: data.userId,
          email: data.email,
          token: data.token,
          type: 'password_reset',
        },
        { attempts: 3 }
      );
      logger.info('Event: Password reset requested - email queued', { userId: data.userId });
    } catch (error) {
      logger.error('Event handler error: PASSWORD_RESET_REQUESTED', { error: (error as Error).message, data });
    }
  });

  logger.info('Event handlers registered');
}

export { eventEmitter, EVENT_TYPES };
