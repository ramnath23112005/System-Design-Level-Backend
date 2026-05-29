import { IClickEvent, IAnalyticsSummary, IPaginationParams, IPaginatedResponse } from '@urlshortener/shared';
import { query } from '../database';

export interface ClickEventRow {
  id: string;
  link_id: string;
  ip_address: string;
  user_agent: string | null;
  referer: string | null;
  country: string | null;
  city: string | null;
  latitude: string | null;
  longitude: string | null;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  device_type: string | null;
  device_model: string | null;
  is_mobile: boolean;
  is_tablet: boolean;
  is_desktop: boolean;
  created_at: Date;
}

function rowToClickEvent(row: ClickEventRow): IClickEvent {
  return {
    id: row.id,
    linkId: row.link_id,
    timestamp: row.created_at,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    referer: row.referer,
    country: row.country,
    city: row.city,
    latitude: row.latitude ? parseFloat(row.latitude) : null,
    longitude: row.longitude ? parseFloat(row.longitude) : null,
    browser: row.browser,
    browserVersion: row.browser_version,
    os: row.os,
    osVersion: row.os_version,
    deviceType: row.device_type,
    deviceModel: row.device_model,
    isMobile: row.is_mobile,
    isTablet: row.is_tablet,
    isDesktop: row.is_desktop,
  };
}

export class ClickEventModel {
  static async create(data: {
    id: string;
    linkId: string;
    ipAddress?: string;
    userAgent?: string;
    referer?: string;
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    browser?: string;
    browserVersion?: string;
    os?: string;
    osVersion?: string;
    deviceType?: string;
    deviceModel?: string;
    isMobile?: boolean;
    isTablet?: boolean;
    isDesktop?: boolean;
  }): Promise<IClickEvent> {
    const result = await query<ClickEventRow>(
      `INSERT INTO click_events (
        id, link_id, ip_address, user_agent, referer,
        country, city, latitude, longitude,
        browser, browser_version, os, os_version,
        device_type, device_model, is_mobile, is_tablet, is_desktop
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        data.id,
        data.linkId,
        data.ipAddress || null,
        data.userAgent || null,
        data.referer || null,
        data.country || null,
        data.city || null,
        data.latitude ?? null,
        data.longitude ?? null,
        data.browser || null,
        data.browserVersion || null,
        data.os || null,
        data.osVersion || null,
        data.deviceType || null,
        data.deviceModel || null,
        data.isMobile ?? null,
        data.isTablet ?? null,
        data.isDesktop ?? null,
      ]
    );
    return rowToClickEvent(result.rows[0]);
  }

  static async findByLinkId(
    linkId: string,
    params: IPaginationParams = {}
  ): Promise<IPaginatedResponse<IClickEvent>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM click_events WHERE link_id = $1',
      [linkId]
    );
    const totalItems = parseInt(countResult.rows[0].count, 10);

    const result = await query<ClickEventRow>(
      'SELECT * FROM click_events WHERE link_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [linkId, limit, offset]
    );

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: result.rows.map(rowToClickEvent),
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

  static async getAnalyticsSummary(linkId: string): Promise<IAnalyticsSummary> {
    const totalClicksResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM click_events WHERE link_id = $1',
      [linkId]
    );
    const totalClicks = parseInt(totalClicksResult.rows[0].count, 10);

    const uniqueVisitorsResult = await query<{ count: string }>(
      'SELECT COUNT(DISTINCT ip_address) as count FROM click_events WHERE link_id = $1',
      [linkId]
    );
    const uniqueVisitors = parseInt(uniqueVisitorsResult.rows[0].count, 10);

    const topCountriesResult = await query<{ country: string; count: string }>(
      'SELECT country, COUNT(*) as count FROM click_events WHERE link_id = $1 AND country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 10',
      [linkId]
    );
    const topCountries = topCountriesResult.rows.map((r) => ({
      country: r.country,
      count: parseInt(r.count, 10),
    }));

    const topBrowsersResult = await query<{ browser: string; count: string }>(
      'SELECT browser, COUNT(*) as count FROM click_events WHERE link_id = $1 AND browser IS NOT NULL GROUP BY browser ORDER BY count DESC LIMIT 10',
      [linkId]
    );
    const topBrowsers = topBrowsersResult.rows.map((r) => ({
      browser: r.browser,
      count: parseInt(r.count, 10),
    }));

    const topDevicesResult = await query<{ deviceType: string; count: string }>(
      'SELECT device_type, COUNT(*) as count FROM click_events WHERE link_id = $1 AND device_type IS NOT NULL GROUP BY device_type ORDER BY count DESC LIMIT 10',
      [linkId]
    );
    const topDevices = topDevicesResult.rows.map((r) => ({
      deviceType: r.devicetype,
      count: parseInt(r.count, 10),
    }));

    const topReferrersResult = await query<{ referer: string; count: string }>(
      'SELECT referer, COUNT(*) as count FROM click_events WHERE link_id = $1 AND referer IS NOT NULL GROUP BY referer ORDER BY count DESC LIMIT 10',
      [linkId]
    );
    const topReferrers = topReferrersResult.rows.map((r) => ({
      referer: r.referer,
      count: parseInt(r.count, 10),
    }));

    const clicksOverTimeResult = await query<{ date: string; count: string }>(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM click_events
       WHERE link_id = $1
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [linkId]
    );
    const clicksOverTime = clicksOverTimeResult.rows.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10),
    }));

    return {
      totalClicks,
      uniqueVisitors,
      topCountries,
      topBrowsers,
      topDevices,
      topReferrers,
      clicksOverTime,
    };
  }

  static async getRecentClicks(
    linkId: string,
    limit: number = 10
  ): Promise<IClickEvent[]> {
    const result = await query<ClickEventRow>(
      'SELECT * FROM click_events WHERE link_id = $1 ORDER BY created_at DESC LIMIT $2',
      [linkId, limit]
    );
    return result.rows.map(rowToClickEvent);
  }

  static async deleteOldClickEvents(retentionDays: number): Promise<number> {
    const result = await query(
      'DELETE FROM click_events WHERE created_at < NOW() - ($1 || \' days\')::INTERVAL',
      [retentionDays]
    );
    return result.rowCount ?? 0;
  }
}
