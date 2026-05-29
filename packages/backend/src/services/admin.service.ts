import {
  IUser,
  ROLES,
  EVENT_TYPES,
} from '@urlshortener/shared';
import { UserModel, LinkModel, ClickEventModel, ApiKeyModel } from '../models';
import { AppError } from '../middleware/error-handler.middleware';
import { logger } from '../utils/logger';
import { cache } from '../utils/cache';
import { query, testConnection } from '../database';

interface SystemStats {
  totalUsers: number;
  totalLinks: number;
  totalClicks: number;
  activeToday: number;
  activeLinks: number;
  activeUsers: number;
  totalApiKeys: number;
  signupsToday: number;
  clicksToday: number;
  linksCreatedToday: number;
}

interface RecentActivity {
  recentSignups: { id: string; name: string; email: string; createdAt: Date }[];
  recentLinks: { id: string; shortCode: string; originalUrl: string; createdAt: Date }[];
  recentClicks: number;
}

interface SystemHealth {
  database: { status: 'healthy' | 'unhealthy'; latencyMs?: number };
  redis: { status: 'healthy' | 'unhealthy'; latencyMs?: number };
  uptime: number;
  memoryUsage: { heapUsed: number; heapTotal: number; rss: number };
  lastChecked: string;
}

export class AdminService {
  static async getSystemStats(): Promise<SystemStats> {
    const totalUsersResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(totalUsersResult.rows[0]?.count || '0', 10);

    const totalLinksResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM links');
    const totalLinks = parseInt(totalLinksResult.rows[0]?.count || '0', 10);

    const totalClicksResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM click_events');
    const totalClicks = parseInt(totalClicksResult.rows[0]?.count || '0', 10);

    const activeTodayResult = await query<{ count: string }>(
      "SELECT COUNT(DISTINCT user_id) as count FROM links WHERE updated_at >= CURRENT_DATE"
    );
    const activeToday = parseInt(activeTodayResult.rows[0]?.count || '0', 10);

    const activeLinksResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM links WHERE is_active = true'
    );
    const activeLinks = parseInt(activeLinksResult.rows[0]?.count || '0', 10);

    const activeUsersResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE is_active = true'
    );
    const activeUsers = parseInt(activeUsersResult.rows[0]?.count || '0', 10);

    const totalApiKeysResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM api_keys WHERE is_active = true'
    );
    const totalApiKeys = parseInt(totalApiKeysResult.rows[0]?.count || '0', 10);

    const signupsTodayResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE'
    );
    const signupsToday = parseInt(signupsTodayResult.rows[0]?.count || '0', 10);

    const clicksTodayResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM click_events WHERE created_at >= CURRENT_DATE'
    );
    const clicksToday = parseInt(clicksTodayResult.rows[0]?.count || '0', 10);

    const linksCreatedTodayResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM links WHERE created_at >= CURRENT_DATE'
    );
    const linksCreatedToday = parseInt(linksCreatedTodayResult.rows[0]?.count || '0', 10);

    return {
      totalUsers,
      totalLinks,
      totalClicks,
      activeToday,
      activeLinks,
      activeUsers,
      totalApiKeys,
      signupsToday,
      clicksToday,
      linksCreatedToday,
    };
  }

  static async getRecentActivity(): Promise<RecentActivity> {
    const recentSignupsResult = await query<any>(
      'SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 10'
    );
    const recentSignups = recentSignupsResult.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      createdAt: r.created_at,
    }));

    const recentLinksResult = await query<any>(
      'SELECT id, short_code, original_url, created_at FROM links ORDER BY created_at DESC LIMIT 10'
    );
    const recentLinks = recentLinksResult.rows.map((r: any) => ({
      id: r.id,
      shortCode: r.short_code,
      originalUrl: r.original_url,
      createdAt: r.created_at,
    }));

    const recentClicksResult = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM click_events WHERE created_at >= NOW() - INTERVAL '1 hour'"
    );
    const recentClicks = parseInt(recentClicksResult.rows[0]?.count || '0', 10);

    return { recentSignups, recentLinks, recentClicks };
  }

  static async manageUser(
    targetUserId: string,
    action: 'activate' | 'deactivate'
  ): Promise<IUser> {
    const user = await UserModel.findById(targetUserId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const isActive = action === 'activate';
    if (user.isActive === isActive) {
      throw AppError.badRequest(
        `User is already ${isActive ? 'active' : 'deactivated'}`
      );
    }

    const updated = await UserModel.update(targetUserId, { isActive });
    if (!updated) {
      throw AppError.internal('Failed to update user status');
    }

    logger.info(`User ${action}d`, {
      targetUserId,
      action,
      performedBy: 'admin',
    });

    return updated;
  }

  static async getSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();
    const memoryUsage = process.memoryUsage();

    let dbStatus: 'healthy' | 'unhealthy' = 'healthy';
    let dbLatency: number | undefined;

    try {
      const dbStart = Date.now();
      const dbHealthy = await testConnection();
      dbLatency = Date.now() - dbStart;
      if (!dbHealthy) {
        dbStatus = 'unhealthy';
      }
    } catch {
      dbStatus = 'unhealthy';
    }

    let redisStatus: 'healthy' | 'unhealthy' = 'healthy';
    let redisLatency: number | undefined;

    try {
      const redisStart = Date.now();
      const redisHealthy = await cache.ping();
      redisLatency = Date.now() - redisStart;
      if (!redisHealthy) {
        redisStatus = 'unhealthy';
      }
    } catch {
      redisStatus = 'unhealthy';
    }

    return {
      database: { status: dbStatus, latencyMs: dbLatency },
      redis: { status: redisStatus, latencyMs: redisLatency },
      uptime: process.uptime(),
      memoryUsage: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        rss: memoryUsage.rss,
      },
      lastChecked: new Date().toISOString(),
    };
  }

  static async getLogs(
    level: string = 'info',
    limit: number = 100
  ): Promise<{ timestamp: string; level: string; message: string; meta?: Record<string, unknown> }[]> {
    const safeLimit = Math.min(Math.max(1, limit), 1000);

    const result = await query<any>(
      `SELECT timestamp, level, message, meta FROM logs
       WHERE level = $1 OR $1 = 'all'
       ORDER BY timestamp DESC LIMIT $2`,
      [level === 'all' ? 'all' : level, safeLimit]
    );

    return result.rows.map((r: any) => ({
      timestamp: r.timestamp,
      level: r.level,
      message: r.message,
      meta: r.meta || undefined,
    }));
  }
}
