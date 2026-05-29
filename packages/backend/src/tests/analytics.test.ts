import request from 'supertest';
import { app } from '../app';
import { config } from '../config';
import {
  createTestUser,
  createTestLink,
  createTestClickEvent,
  cleanDatabase,
} from './helpers';
import { HTTP_STATUS } from '@urlshortener/shared';

const API_PREFIX = config.app.apiPrefix;

describe('Analytics Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('GET /api/v1/analytics/dashboard', () => {
    it('should return dashboard stats with data', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);
      await createTestClickEvent(link.id, { country: 'US', browser: 'Chrome' });
      await createTestClickEvent(link.id, { country: 'DE', browser: 'Firefox' });

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/dashboard`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalClicks).toBe(2);
      expect(res.body.data.totalLinks).toBe(1);
      expect(res.body.data.uniqueVisitors).toBe(1);
      expect(res.body.data.topLinks).toHaveLength(1);
      expect(res.body.data.clicksToday).toBe(2);
      expect(res.body.data.clicksThisWeek).toBe(2);
      expect(res.body.data.clicksThisMonth).toBe(2);
    });

    it('should return empty stats when user has no links', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/dashboard`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalClicks).toBe(0);
      expect(res.body.data.totalLinks).toBe(0);
      expect(res.body.data.uniqueVisitors).toBe(0);
      expect(res.body.data.topLinks).toHaveLength(0);
    });

    it('should respect period parameter', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);
      await createTestClickEvent(link.id);

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/dashboard?period=30d`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.totalClicks).toBe(1);
    });

    it('should not include other users data', async () => {
      const { user: user1 } = await createTestUser({ email: 'analytics-owner@test.com' });
      const { token: token2 } = await createTestUser({ email: 'analytics-other@test.com' });

      const link1 = await createTestLink(user1.id);
      await createTestClickEvent(link1.id);

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/dashboard`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.totalClicks).toBe(0);
      expect(res.body.data.totalLinks).toBe(0);
    });
  });

  describe('GET /api/v1/analytics/links/:linkId/clicks', () => {
    it('should return click analytics with pagination', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      for (let i = 0; i < 15; i++) {
        await createTestClickEvent(link.id);
      }

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/links/${link.id}/clicks?page=1&limit=10`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toHaveLength(10);
      expect(res.body.data.meta.totalItems).toBe(15);
      expect(res.body.data.meta.totalPages).toBe(2);
      expect(res.body.data.meta.hasNextPage).toBe(true);
    });

    it('should filter by country', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      await createTestClickEvent(link.id, { country: 'US' });
      await createTestClickEvent(link.id, { country: 'DE' });

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/links/${link.id}/clicks?country=US`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by date range', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);
      await createTestClickEvent(link.id);

      const startDate = new Date(Date.now() - 86400000).toISOString();
      const endDate = new Date(Date.now() + 86400000).toISOString();

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/links/${link.id}/clicks?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should forbid access to other users link', async () => {
      const { user: user1 } = await createTestUser({ email: 'click-owner@test.com' });
      const { token: token2 } = await createTestUser({ email: 'click-other@test.com' });

      const link = await createTestLink(user1.id);

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/links/${link.id}/clicks`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
    });

    it('should return 404 for non-existent link', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/links/nonexistent/clicks`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('GET /api/v1/analytics/links/:linkId/geo', () => {
    it('should return geographic data', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      await createTestClickEvent(link.id, { country: 'US', city: 'New York' });

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/links/${link.id}/geo`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.countries).toBeDefined();
      expect(res.body.data.cities).toBeDefined();
      expect(res.body.data.countries.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.countries[0].country).toBe('US');
      expect(res.body.data.countries[0].count).toBe(1);
    });

    it('should return empty geo data when no clicks exist', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/links/${link.id}/geo`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.countries).toHaveLength(0);
      expect(res.body.data.cities).toHaveLength(0);
    });
  });

  describe('GET /api/v1/analytics/links/:linkId/devices', () => {
    it('should return device type breakdown', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      await createTestClickEvent(link.id, { deviceType: 'desktop' });
      await createTestClickEvent(link.id, { deviceType: 'mobile' });

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/links/${link.id}/devices`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.deviceTypes).toBeDefined();
      expect(res.body.data.browsers).toBeDefined();
      expect(res.body.data.operatingSystems).toBeDefined();
      expect(res.body.data.deviceTypes.length).toBeGreaterThanOrEqual(1);
    });

    it('should return browser breakdown', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      await createTestClickEvent(link.id, { browser: 'Chrome' });
      await createTestClickEvent(link.id, { browser: 'Firefox' });

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/links/${link.id}/devices`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      const browsers = res.body.data.browsers.map((b: { browser: string }) => b.browser);
      expect(browsers).toContain('Chrome');
    });
  });

  describe('GET /api/v1/analytics/links/:linkId/timeline', () => {
    it('should return click timeline data', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      await createTestClickEvent(link.id);

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/links/${link.id}/timeline`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.interval).toBe('daily');
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.data[0].count).toBe(1);
    });

    it('should support hourly interval', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      await createTestClickEvent(link.id);

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/links/${link.id}/timeline?interval=hourly`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.interval).toBe('hourly');
    });

    it('should support monthly interval', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      await createTestClickEvent(link.id);

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/links/${link.id}/timeline?interval=monthly`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.interval).toBe('monthly');
    });
  });

  describe('GET /api/v1/analytics/realtime', () => {
    it('should return real-time stats', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      await createTestClickEvent(link.id);

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/realtime`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.clicksInLastHour).toBeDefined();
      expect(res.body.data.uniqueIpsInLastHour).toBeDefined();
      expect(res.body.data.recentClicks).toBeDefined();
      expect(res.body.data.topLinksNow).toBeDefined();
    });

    it('should return zeros when no links exist', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/realtime`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.clicksInLastHour).toBe(0);
      expect(res.body.data.uniqueIpsInLastHour).toBe(0);
      expect(res.body.data.recentClicks).toHaveLength(0);
      expect(res.body.data.topLinksNow).toHaveLength(0);
    });
  });

  describe('GET /api/v1/analytics/links/:linkId/export', () => {
    it('should export analytics in CSV format', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      await createTestClickEvent(link.id);

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/links/${link.id}/export?format=csv`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      if (typeof res.text === 'string') {
        expect(res.text).toContain('id,linkId,timestamp');
        expect(res.headers['content-type']).toContain('text/csv');
      }
    });

    it('should export analytics in JSON format', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      await createTestClickEvent(link.id);

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/links/${link.id}/export?format=json`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should default to JSON format', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      await createTestClickEvent(link.id);

      const res = await request(app)
        .get(`${API_PREFIX}/analytics/links/${link.id}/export`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
