import {
  IAnalyticsSummary,
  IClickEvent,
  IPaginatedResponse,
  IPaginationParams,
  CACHE_PREFIXES,
} from '@urlshortener/shared';
import { LinkModel, ClickEventModel } from '../models';
import { config } from '../config';
import { AppError } from '../middleware/error-handler.middleware';
import { logger } from '../utils/logger';
import { cache } from '../utils/cache';
import { query } from '../database';

interface DashboardStats {
  totalClicks: number;
  totalLinks: number;
  uniqueVisitors: number;
  topLinks: { linkId: string; shortCode: string; originalUrl: string; clicks: number }[];
  clicksToday: number;
  clicksThisWeek: number;
  clicksThisMonth: number;
}

interface GeographicData {
  countries: { country: string; count: number; percentage: number }[];
  cities: { city: string; country: string; count: number; percentage: number }[];
}

interface DeviceAnalytics {
  deviceTypes: { deviceType: string; count: number; percentage: number }[];
  browsers: { browser: string; count: number; percentage: number }[];
  operatingSystems: { os: string; count: number; percentage: number }[];
}

interface ClicksOverTime {
  interval: string;
  data: { time: string; count: number }[];
}

interface ReferrerData {
  referrers: { referer: string; count: number; percentage: number }[];
  directTraffic: number;
  directTrafficPercentage: number;
}

interface RealTimeStats {
  clicksInLastHour: number;
  uniqueIpsInLastHour: number;
  recentClicks: IClickEvent[];
  topLinksNow: { linkId: string; shortCode: string; clicks: number }[];
}

export class AnalyticsService {
  static async getDashboardStats(userId: string, period: string = '7d'): Promise<DashboardStats> {
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}:dashboard:${userId}:${period}`;
    const cached = await cache.get<DashboardStats>(cacheKey);
    if (cached) {
      return cached;
    }

    const userLinks = await LinkModel.findByUserId(userId, { limit: 1000 });
    const linkIds = userLinks.data.map((l) => l.id);
    const totalLinks = userLinks.meta.totalItems;

    if (linkIds.length === 0) {
      const empty: DashboardStats = {
        totalClicks: 0,
        totalLinks: 0,
        uniqueVisitors: 0,
        topLinks: [],
        clicksToday: 0,
        clicksThisWeek: 0,
        clicksThisMonth: 0,
      };
      return empty;
    }

    const periodDays = AnalyticsService.parsePeriod(period);
    const dateFilter = `created_at >= NOW() - INTERVAL '${periodDays} days'`;

    const totalClicksResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM click_events WHERE link_id = ANY($1::uuid[]) AND ${dateFilter}`,
      [linkIds]
    );
    const totalClicks = parseInt(totalClicksResult.rows[0]?.count || '0', 10);

    const uniqueVisitorsResult = await query<{ count: string }>(
      `SELECT COUNT(DISTINCT ip_address) as count FROM click_events WHERE link_id = ANY($1::uuid[]) AND ${dateFilter}`,
      [linkIds]
    );
    const uniqueVisitors = parseInt(uniqueVisitorsResult.rows[0]?.count || '0', 10);

    const topLinksResult = await query<{ link_id: string; count: string }>(
      `SELECT link_id, COUNT(*) as count FROM click_events WHERE link_id = ANY($1::uuid[]) AND ${dateFilter} GROUP BY link_id ORDER BY count DESC LIMIT 10`,
      [linkIds]
    );
    const topLinksData = topLinksResult.rows.map((r) => {
      const link = userLinks.data.find((l) => l.id === r.link_id);
      return {
        linkId: r.link_id,
        shortCode: link?.shortCode || '',
        originalUrl: link?.originalUrl || '',
        clicks: parseInt(r.count, 10),
      };
    });

    const todayResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM click_events WHERE link_id = ANY($1::uuid[]) AND created_at >= CURRENT_DATE`,
      [linkIds]
    );
    const clicksToday = parseInt(todayResult.rows[0]?.count || '0', 10);

    const weekResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM click_events WHERE link_id = ANY($1::uuid[]) AND created_at >= DATE_TRUNC('week', CURRENT_DATE)`,
      [linkIds]
    );
    const clicksThisWeek = parseInt(weekResult.rows[0]?.count || '0', 10);

    const monthResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM click_events WHERE link_id = ANY($1::uuid[]) AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      [linkIds]
    );
    const clicksThisMonth = parseInt(monthResult.rows[0]?.count || '0', 10);

    const stats: DashboardStats = {
      totalClicks,
      totalLinks,
      uniqueVisitors,
      topLinks: topLinksData,
      clicksToday,
      clicksThisWeek,
      clicksThisMonth,
    };

    await cache.set(cacheKey, stats, 300);
    return stats;
  }

  static async getClickAnalytics(
    linkId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      country?: string;
      deviceType?: string;
      browser?: string;
    } & IPaginationParams = {}
  ): Promise<IPaginatedResponse<IClickEvent>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['link_id = $1'];
    const values: any[] = [linkId];
    let paramIndex = 2;

    if (filters.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(filters.endDate);
    }
    if (filters.country) {
      conditions.push(`country = $${paramIndex++}`);
      values.push(filters.country);
    }
    if (filters.deviceType) {
      conditions.push(`device_type = $${paramIndex++}`);
      values.push(filters.deviceType);
    }
    if (filters.browser) {
      conditions.push(`browser = $${paramIndex++}`);
      values.push(filters.browser);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM click_events WHERE ${whereClause}`,
      values
    );
    const totalItems = parseInt(countResult.rows[0]?.count || '0', 10);

    const result = await query<any>(
      `SELECT * FROM click_events WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset]
    );

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: result.rows,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  static async getGeographicData(linkId: string): Promise<GeographicData> {
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}:geo:${linkId}`;
    const cached = await cache.get<GeographicData>(cacheKey);
    if (cached) return cached;

    const totalResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM click_events WHERE link_id = $1',
      [linkId]
    );
    const total = parseInt(totalResult.rows[0]?.count || '0', 10);

    const countriesResult = await query<{ country: string; count: string }>(
      `SELECT country, COUNT(*) as count FROM click_events
       WHERE link_id = $1 AND country IS NOT NULL
       GROUP BY country ORDER BY count DESC LIMIT 50`,
      [linkId]
    );
    const countries = countriesResult.rows.map((r) => ({
      country: r.country,
      count: parseInt(r.count, 10),
      percentage: total > 0 ? Math.round((parseInt(r.count, 10) / total) * 10000) / 100 : 0,
    }));

    const citiesResult = await query<{ city: string; country: string; count: string }>(
      `SELECT city, country, COUNT(*) as count FROM click_events
       WHERE link_id = $1 AND city IS NOT NULL
       GROUP BY city, country ORDER BY count DESC LIMIT 50`,
      [linkId]
    );
    const cities = citiesResult.rows.map((r) => ({
      city: r.city,
      country: r.country,
      count: parseInt(r.count, 10),
      percentage: total > 0 ? Math.round((parseInt(r.count, 10) / total) * 10000) / 100 : 0,
    }));

    const result: GeographicData = { countries, cities };
    await cache.set(cacheKey, result, 600);
    return result;
  }

  static async getDeviceAnalytics(linkId: string): Promise<DeviceAnalytics> {
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}:device:${linkId}`;
    const cached = await cache.get<DeviceAnalytics>(cacheKey);
    if (cached) return cached;

    const totalResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM click_events WHERE link_id = $1',
      [linkId]
    );
    const total = parseInt(totalResult.rows[0]?.count || '0', 10);

    const deviceTypesResult = await query<{ deviceType: string; count: string }>(
      `SELECT device_type, COUNT(*) as count FROM click_events
       WHERE link_id = $1 AND device_type IS NOT NULL
       GROUP BY device_type ORDER BY count DESC`,
      [linkId]
    );
    const deviceTypes = deviceTypesResult.rows.map((r) => ({
      deviceType: r.devicetype,
      count: parseInt(r.count, 10),
      percentage: total > 0 ? Math.round((parseInt(r.count, 10) / total) * 10000) / 100 : 0,
    }));

    const browsersResult = await query<{ browser: string; count: string }>(
      `SELECT browser, COUNT(*) as count FROM click_events
       WHERE link_id = $1 AND browser IS NOT NULL
       GROUP BY browser ORDER BY count DESC`,
      [linkId]
    );
    const browsers = browsersResult.rows.map((r) => ({
      browser: r.browser,
      count: parseInt(r.count, 10),
      percentage: total > 0 ? Math.round((parseInt(r.count, 10) / total) * 10000) / 100 : 0,
    }));

    const osResult = await query<{ os: string; count: string }>(
      `SELECT os, COUNT(*) as count FROM click_events
       WHERE link_id = $1 AND os IS NOT NULL
       GROUP BY os ORDER BY count DESC`,
      [linkId]
    );
    const operatingSystems = osResult.rows.map((r) => ({
      os: r.os,
      count: parseInt(r.count, 10),
      percentage: total > 0 ? Math.round((parseInt(r.count, 10) / total) * 10000) / 100 : 0,
    }));

    const result: DeviceAnalytics = { deviceTypes, browsers, operatingSystems };
    await cache.set(cacheKey, result, 600);
    return result;
  }

  static async getClicksOverTime(
    linkId: string,
    interval: 'hourly' | 'daily' | 'monthly' = 'daily'
  ): Promise<ClicksOverTime> {
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}:clicksOverTime:${linkId}:${interval}`;
    const cached = await cache.get<ClicksOverTime>(cacheKey);
    if (cached) return cached;

    let dateTrunc: string;
    let orderBy: string;

    switch (interval) {
      case 'hourly':
        dateTrunc = "DATE_TRUNC('hour', created_at)";
        orderBy = 'hour ASC';
        break;
      case 'monthly':
        dateTrunc = "DATE_TRUNC('month', created_at)";
        orderBy = 'month ASC';
        break;
      case 'daily':
      default:
        dateTrunc = "DATE_TRUNC('day', created_at)";
        orderBy = 'day ASC';
        break;
    }

    const result = await query<{ time: string; count: string }>(
      `SELECT ${dateTrunc} as time, COUNT(*) as count
       FROM click_events
       WHERE link_id = $1
       GROUP BY time
       ORDER BY ${orderBy}`,
      [linkId]
    );

    const data = result.rows.map((r) => ({
      time: r.time,
      count: parseInt(r.count, 10),
    }));

    const response: ClicksOverTime = { interval, data };
    await cache.set(cacheKey, response, 600);
    return response;
  }

  static async getReferrerData(linkId: string): Promise<ReferrerData> {
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}:referrer:${linkId}`;
    const cached = await cache.get<ReferrerData>(cacheKey);
    if (cached) return cached;

    const totalResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM click_events WHERE link_id = $1',
      [linkId]
    );
    const total = parseInt(totalResult.rows[0]?.count || '0', 10);

    const directResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM click_events
       WHERE link_id = $1 AND (referer IS NULL OR referer = '')`,
      [linkId]
    );
    const directTraffic = parseInt(directResult.rows[0]?.count || '0', 10);

    const referrersResult = await query<{ referer: string; count: string }>(
      `SELECT referer, COUNT(*) as count FROM click_events
       WHERE link_id = $1 AND referer IS NOT NULL AND referer != ''
       GROUP BY referer ORDER BY count DESC LIMIT 20`,
      [linkId]
    );
    const referrers = referrersResult.rows.map((r) => ({
      referer: r.referer,
      count: parseInt(r.count, 10),
      percentage: total > 0 ? Math.round((parseInt(r.count, 10) / total) * 10000) / 100 : 0,
    }));

    const result: ReferrerData = {
      referrers,
      directTraffic,
      directTrafficPercentage: total > 0 ? Math.round((directTraffic / total) * 10000) / 100 : 0,
    };

    await cache.set(cacheKey, result, 600);
    return result;
  }

  static async getRealTimeStats(userId: string): Promise<RealTimeStats> {
    const userLinks = await LinkModel.findByUserId(userId, { limit: 1000 });
    const linkIds = userLinks.data.map((l) => l.id);

    if (linkIds.length === 0) {
      return {
        clicksInLastHour: 0,
        uniqueIpsInLastHour: 0,
        recentClicks: [],
        topLinksNow: [],
      };
    }

    const hourAgo = new Date(Date.now() - 3600000).toISOString();

    const clicksResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM click_events
       WHERE link_id = ANY($1::uuid[]) AND created_at >= $2`,
      [linkIds, hourAgo]
    );
    const clicksInLastHour = parseInt(clicksResult.rows[0]?.count || '0', 10);

    const uniqueIpsResult = await query<{ count: string }>(
      `SELECT COUNT(DISTINCT ip_address) as count FROM click_events
       WHERE link_id = ANY($1::uuid[]) AND created_at >= $2`,
      [linkIds, hourAgo]
    );
    const uniqueIpsInLastHour = parseInt(uniqueIpsResult.rows[0]?.count || '0', 10);

    const recentResult = await query<any>(
      `SELECT * FROM click_events
       WHERE link_id = ANY($1::uuid[])
       ORDER BY created_at DESC LIMIT 50`,
      [linkIds]
    );

    const topLinksNowResult = await query<{ link_id: string; count: string }>(
      `SELECT link_id, COUNT(*) as count FROM click_events
       WHERE link_id = ANY($1::uuid[]) AND created_at >= $2
       GROUP BY link_id ORDER BY count DESC LIMIT 10`,
      [linkIds, hourAgo]
    );
    const topLinksNow = topLinksNowResult.rows.map((r) => {
      const link = userLinks.data.find((l) => l.id === r.link_id);
      return {
        linkId: r.link_id,
        shortCode: link?.shortCode || '',
        clicks: parseInt(r.count, 10),
      };
    });

    return {
      clicksInLastHour,
      uniqueIpsInLastHour,
      recentClicks: recentResult.rows,
      topLinksNow,
    };
  }

  static async exportAnalytics(
    linkId: string,
    format: 'csv' | 'json' = 'json'
  ): Promise<string | Record<string, unknown>[]> {
    const clicks = await ClickEventModel.findByLinkId(linkId, { limit: 10000 });
    const data = clicks.data;

    if (format === 'csv') {
      const headers = [
        'id', 'linkId', 'timestamp', 'ipAddress', 'userAgent', 'referer',
        'country', 'city', 'browser', 'browserVersion', 'os', 'osVersion',
        'deviceType', 'deviceModel', 'isMobile', 'isTablet', 'isDesktop',
      ];
      const csvRows = [headers.join(',')];

      for (const event of data) {
        const row = headers.map((h) => {
          const val = (event as any)[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        csvRows.push(row.join(','));
      }

      return csvRows.join('\n');
    }

    return data;
  }

  private static parsePeriod(period: string): number {
    const match = period.match(/^(\d+)([dhwmy])$/);
    if (!match) return 7;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'h': return value / 24;
      case 'd': return value;
      case 'w': return value * 7;
      case 'm': return value * 30;
      case 'y': return value * 365;
      default: return 7;
    }
  }
}
