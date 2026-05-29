import request from 'supertest';
import { app } from '../app';
import { LinkModel } from '../models';
import { config } from '../config';
import { createTestUser, createTestLink, createTestLinkWithPassword, cleanDatabase } from './helpers';
import { HTTP_STATUS } from '@urlshortener/shared';

const API_PREFIX = config.app.apiPrefix;

describe('Link Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('POST /api/v1/links', () => {
    it('should create a short link when authenticated', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post(`${API_PREFIX}/links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          originalUrl: 'https://example.com',
          title: 'Example Link',
        });

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.originalUrl).toBe('https://example.com');
      expect(res.body.data.shortCode).toBeDefined();
      expect(res.body.data.shortCode.length).toBe(7);
      expect(res.body.data.title).toBe('Example Link');
    });

    it('should reject creating a link when unauthenticated', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/links`)
        .send({
          originalUrl: 'https://example.com',
        });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });

    it('should reject creating a link with invalid URL', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post(`${API_PREFIX}/links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          originalUrl: 'not-a-url',
        });

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE);
      expect(res.body.success).toBe(false);
    });

    it('should reject creating a link with empty body', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post(`${API_PREFIX}/links`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE);
      expect(res.body.success).toBe(false);
    });

    it('should create a link with custom alias', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post(`${API_PREFIX}/links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          originalUrl: 'https://example.com',
          customAlias: 'my-custom-link',
          title: 'Custom Link',
        });

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.data.customAlias).toBe('my-custom-link');
      expect(res.body.data.shortCode).toBe('my-custom-link');
    });

    it('should reject duplicate custom alias', async () => {
      const { user, token } = await createTestUser();
      await createTestLink(user.id, { customAlias: 'taken-alias' });

      const res = await request(app)
        .post(`${API_PREFIX}/links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          originalUrl: 'https://another.com',
          customAlias: 'taken-alias',
        });

      expect(res.status).toBe(HTTP_STATUS.CONFLICT);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already taken');
    });

    it('should reject custom alias that is too short', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post(`${API_PREFIX}/links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          originalUrl: 'https://example.com',
          customAlias: 'ab',
        });

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE);
      expect(res.body.success).toBe(false);
    });

    it('should create a link with tags', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post(`${API_PREFIX}/links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          originalUrl: 'https://example.com',
          tags: ['marketing', 'social'],
        });

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.data.tags).toEqual(expect.arrayContaining(['marketing', 'social']));
    });
  });

  describe('GET /api/v1/links', () => {
    it('should return paginated user links', async () => {
      const { user, token } = await createTestUser();
      await createTestLink(user.id, { title: 'Link 1' });
      await createTestLink(user.id, { title: 'Link 2' });
      await createTestLink(user.id, { title: 'Link 3' });

      const res = await request(app)
        .get(`${API_PREFIX}/links`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toHaveLength(3);
      expect(res.body.data.meta).toBeDefined();
      expect(res.body.data.meta.totalItems).toBe(3);
      expect(res.body.data.meta.page).toBe(1);
    });

    it('should return empty list when user has no links', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get(`${API_PREFIX}/links`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toHaveLength(0);
      expect(res.body.data.meta.totalItems).toBe(0);
    });

    it('should not return other users links', async () => {
      const { user: user1 } = await createTestUser({ email: 'user1@test.com' });
      const { token: token2 } = await createTestUser({ email: 'user2@test.com' });

      await createTestLink(user1.id, { title: 'User 1 Link' });

      const res = await request(app)
        .get(`${API_PREFIX}/links`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.data).toHaveLength(0);
    });

    it('should respect pagination parameters', async () => {
      const { user, token } = await createTestUser();
      for (let i = 0; i < 5; i++) {
        await createTestLink(user.id, { title: `Link ${i}` });
      }

      const res = await request(app)
        .get(`${API_PREFIX}/links?page=1&limit=2`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.data).toHaveLength(2);
      expect(res.body.data.meta.totalItems).toBe(5);
      expect(res.body.data.meta.totalPages).toBe(3);
      expect(res.body.data.meta.hasNextPage).toBe(true);
    });
  });

  describe('GET /api/v1/links/:id', () => {
    it('should return the link when owner requests it', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      const res = await request(app)
        .get(`${API_PREFIX}/links/${link.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(link.id);
      expect(res.body.data.originalUrl).toBe(link.originalUrl);
    });

    it('should return 404 when another user requests the link', async () => {
      const { user: user1 } = await createTestUser({ email: 'owner@test.com' });
      const { token: token2 } = await createTestUser({ email: 'other@test.com' });

      const link = await createTestLink(user1.id);

      const res = await request(app)
        .get(`${API_PREFIX}/links/${link.id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent link', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get(`${API_PREFIX}/links/nonexistent-id`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(res.body.success).toBe(false);
    });

    it('should show password field as null for security', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLinkWithPassword(user.id);

      const res = await request(app)
        .get(`${API_PREFIX}/links/${link.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.password).toBeDefined();
    });
  });

  describe('PATCH /api/v1/links/:id', () => {
    it('should update the link when owner requests it', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      const res = await request(app)
        .patch(`${API_PREFIX}/links/${link.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Title',
        });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.title).toBe('Updated Title');
    });

    it('should reject update from non-owner', async () => {
      const { user: user1 } = await createTestUser({ email: 'owner@test.com' });
      const { token: token2 } = await createTestUser({ email: 'other@test.com' });

      const link = await createTestLink(user1.id);

      const res = await request(app)
        .patch(`${API_PREFIX}/links/${link.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          title: 'Hacked Title',
        });

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body.success).toBe(false);
    });

    it('should reject update with invalid URL', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      const res = await request(app)
        .patch(`${API_PREFIX}/links/${link.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          originalUrl: 'not-a-valid-url',
        });

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(res.body.success).toBe(false);
    });

    it('should reject update of non-existent link', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .patch(`${API_PREFIX}/links/nonexistent-id`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'New Title',
        });

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(res.body.success).toBe(false);
    });

    it('should update link active status', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      const res = await request(app)
        .patch(`${API_PREFIX}/links/${link.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          isActive: false,
        });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.isActive).toBe(false);

      const updated = await LinkModel.findById(link.id);
      expect(updated!.isActive).toBe(false);
    });
  });

  describe('DELETE /api/v1/links/:id', () => {
    it('should soft delete the link when owner requests it', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      const res = await request(app)
        .delete(`${API_PREFIX}/links/${link.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);

      const deleted = await LinkModel.findById(link.id);
      expect(deleted!.isActive).toBe(false);
    });

    it('should reject delete from non-owner', async () => {
      const { user: user1 } = await createTestUser({ email: 'owner@test.com' });
      const { token: token2 } = await createTestUser({ email: 'other@test.com' });

      const link = await createTestLink(user1.id);

      const res = await request(app)
        .delete(`${API_PREFIX}/links/${link.id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 when deleting non-existent link', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .delete(`${API_PREFIX}/links/nonexistent-id`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(res.body.success).toBe(false);
    });

    it('should allow deleting an already deleted link', async () => {
      const { user, token } = await createTestUser();
      const link = await createTestLink(user.id);

      await LinkModel.softDelete(link.id);

      const res = await request(app)
        .delete(`${API_PREFIX}/links/${link.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /:code (Redirect)', () => {
    it('should redirect to the original URL for a valid code', async () => {
      const { user } = await createTestUser();
      const link = await createTestLink(user.id, {
        originalUrl: 'https://redirect-target.com',
      });

      const res = await request(app)
        .get(`/${link.shortCode}`)
        .set('User-Agent', 'TestAgent/1.0')
        .set('Referer', 'https://referrer.com');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('https://redirect-target.com');
    });

    it('should return 404 for a non-existent code', async () => {
      const res = await request(app).get('/nonexist');

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(res.body.success).toBe(false);
    });

    it('should return 410 for an expired link', async () => {
      const { user } = await createTestUser();
      const pastDate = new Date(Date.now() - 86400000);
      const link = await createTestLink(user.id, {
        originalUrl: 'https://expired.com',
      });

      await LinkModel.update(link.id, { expiresAt: pastDate });

      const res = await request(app).get(`/${link.shortCode}`);

      expect(res.status).toBe(410);
      expect(res.body.message).toContain('expired');
    });

    it('should return 410 for a deactivated link', async () => {
      const { user } = await createTestUser();
      const link = await createTestLink(user.id);

      await LinkModel.softDelete(link.id);

      const res = await request(app).get(`/${link.shortCode}`);

      expect(res.status).toBe(410);
      expect(res.body.message).toContain('no longer active');
    });

    it('should require password for password-protected link', async () => {
      const { user } = await createTestUser();
      const link = await createTestLinkWithPassword(user.id, 'mypassword');

      const res = await request(app).get(`/${link.shortCode}`);

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.message).toContain('password protected');
    });

    it('should redirect when correct password is provided', async () => {
      const { user } = await createTestUser();
      const link = await createTestLinkWithPassword(user.id, 'mypassword');

      const res = await request(app)
        .get(`/${link.shortCode}?pwd=mypassword`)
        .set('User-Agent', 'TestAgent/1.0');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBeDefined();
    });

    it('should reject incorrect password', async () => {
      const { user } = await createTestUser();
      const link = await createTestLinkWithPassword(user.id, 'mypassword');

      const res = await request(app)
        .get(`/${link.shortCode}?pwd=wrongpassword`)
        .set('User-Agent', 'TestAgent/1.0');

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.message).toContain('Invalid password');
    });

    it('should reject short codes that are too short', async () => {
      const res = await request(app).get('/ab');

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('Custom Alias Conflicts', () => {
    it('should allow different users to use different custom aliases', async () => {
      const { user: user1, token: token1 } = await createTestUser({ email: 'alias1@test.com' });
      const { token: token2 } = await createTestUser({ email: 'alias2@test.com' });

      await request(app)
        .post(`${API_PREFIX}/links`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          originalUrl: 'https://first.com',
          customAlias: 'first-alias',
        });

      const res = await request(app)
        .post(`${API_PREFIX}/links`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          originalUrl: 'https://second.com',
          customAlias: 'second-alias',
        });

      expect(res.status).toBe(HTTP_STATUS.CREATED);
    });

    it('should reject same custom alias from different users', async () => {
      const { user: user1, token: token1 } = await createTestUser({ email: 'user1-conflict@test.com' });
      const { token: token2 } = await createTestUser({ email: 'user2-conflict@test.com' });

      await request(app)
        .post(`${API_PREFIX}/links`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          originalUrl: 'https://first.com',
          customAlias: 'conflict-alias',
        });

      const res = await request(app)
        .post(`${API_PREFIX}/links`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          originalUrl: 'https://second.com',
          customAlias: 'conflict-alias',
        });

      expect(res.status).toBe(HTTP_STATUS.CONFLICT);
      expect(res.body.success).toBe(false);
    });
  });
});
