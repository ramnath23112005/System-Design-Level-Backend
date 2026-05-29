import request from 'supertest';
import { app } from '../app';
import { UserModel } from '../models';
import { AuthService } from '../services/auth.service';
import { config } from '../config';
import { createTestUser, cleanDatabase } from './helpers';
import { HTTP_STATUS } from '@urlshortener/shared';

const API_PREFIX = config.app.apiPrefix;

describe('Auth Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send({
          email: 'newuser@example.com',
          password: 'StrongPass1!',
          name: 'New User',
        });

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('newuser@example.com');
      expect(res.body.data.user.name).toBe('New User');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.message).toBe('Registration successful');

      const user = await UserModel.findByEmail('newuser@example.com');
      expect(user).not.toBeNull();
      expect(user!.email).toBe('newuser@example.com');
    });

    it('should reject registration with duplicate email', async () => {
      await createTestUser({ email: 'duplicate@example.com' });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send({
          email: 'duplicate@example.com',
          password: 'StrongPass1!',
          name: 'Duplicate User',
        });

      expect(res.status).toBe(HTTP_STATUS.CONFLICT);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send({
          email: 'not-an-email',
          password: 'StrongPass1!',
          name: 'Invalid Email',
        });

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with short password', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send({
          email: 'user@example.com',
          password: '123',
          name: 'Short Password',
        });

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration without name', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send({
          email: 'user@example.com',
          password: 'StrongPass1!',
        });

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with empty request body', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send({});

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const { user } = await createTestUser({
        email: 'login-test@example.com',
        password: 'CorrectPass1!',
      });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: 'login-test@example.com',
          password: 'CorrectPass1!',
        });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('login-test@example.com');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.message).toBe('Login successful');
    });

    it('should reject login with wrong password', async () => {
      await createTestUser({
        email: 'wrong-pw@example.com',
        password: 'CorrectPass1!',
      });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: 'wrong-pw@example.com',
          password: 'WrongPass1!',
        });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject login with non-existent user', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePass1!',
        });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject login with missing password', async () => {
      await createTestUser({ email: 'missing-pw@example.com' });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: 'missing-pw@example.com',
        });

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with empty email', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: '',
          password: 'SomePass1!',
        });

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('should refresh token successfully', async () => {
      const { refreshToken } = await createTestUser({
        email: 'refresh-test@example.com',
      });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/refresh-token`)
        .send({ refreshToken });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.accessToken).not.toBe(refreshToken);
    });

    it('should reject expired refresh token', async () => {
      const expiredToken = AuthService.verifyToken;

      const token = require('jsonwebtoken').sign(
        { userId: 'fake', role: 'user', type: 'refresh' },
        config.jwt.refreshSecret,
        { expiresIn: '0s', issuer: config.jwt.issuer }
      );

      await new Promise((r) => setTimeout(r, 1100));

      const res = await request(app)
        .post(`${API_PREFIX}/auth/refresh-token`)
        .send({ refreshToken: token });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/refresh-token`)
        .send({ refreshToken: 'this-is-not-a-valid-jwt-token' });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });

    it('should reject refresh with missing token', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/refresh-token`)
        .send({});

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });

    it('should reject refresh with access token instead of refresh token', async () => {
      const { token } = await createTestUser({
        email: 'wrong-type@example.com',
      });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/refresh-token`)
        .send({ refreshToken: token });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('should change password successfully', async () => {
      const { user, token } = await createTestUser({
        email: 'change-pw@example.com',
        password: 'OldPass1!',
      });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/change-password`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          oldPassword: 'OldPass1!',
          newPassword: 'NewPass1!',
        });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);

      const loginRes = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: 'change-pw@example.com',
          password: 'NewPass1!',
        });

      expect(loginRes.status).toBe(HTTP_STATUS.OK);
    });

    it('should reject change password with wrong old password', async () => {
      const { user, token } = await createTestUser({
        email: 'wrong-old-pw@example.com',
        password: 'CorrectOld1!',
      });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/change-password`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          oldPassword: 'WrongOld1!',
          newPassword: 'NewPass1!',
        });

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Current password is incorrect');
    });

    it('should reject change password without authentication', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/change-password`)
        .send({
          oldPassword: 'OldPass1!',
          newPassword: 'NewPass1!',
        });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });

    it('should reject change password with short new password', async () => {
      const { token } = await createTestUser({
        email: 'short-new@example.com',
      });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/change-password`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          oldPassword: 'SomeOld1!',
          newPassword: 'short',
        });

      expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE);
      expect(res.body.success).toBe(false);
    });
  });

  describe('JWT Auth Middleware', () => {
    const protectedRoute = `${API_PREFIX}/links`;

    it('should reject request with no token', async () => {
      const res = await request(app).get(protectedRoute);

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Authentication required');
    });

    it('should reject request with malformed authorization header', async () => {
      const res = await request(app)
        .get(protectedRoute)
        .set('Authorization', 'Invalid');

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get(protectedRoute)
        .set('Authorization', 'Bearer this-is-not-a-valid-token');

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid token');
    });

    it('should reject request with expired token', async () => {
      const expiredToken = require('jsonwebtoken').sign(
        { id: 'fake', email: 'test@test.com', role: 'user' },
        config.jwt.secret,
        { expiresIn: '0s', issuer: config.jwt.issuer }
      );

      await new Promise((r) => setTimeout(r, 1100));

      const res = await request(app)
        .get(protectedRoute)
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Token has expired');
    });

    it('should accept request with valid token', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get(protectedRoute)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).not.toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(true);
    });

    it('should reject token signed with wrong secret', async () => {
      const wrongToken = require('jsonwebtoken').sign(
        { id: 'fake', email: 'test@test.com', role: 'user' },
        'wrong-secret',
        { expiresIn: '15m', issuer: config.jwt.issuer }
      );

      const res = await request(app)
        .get(protectedRoute)
        .set('Authorization', `Bearer ${wrongToken}`);

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with empty bearer token', async () => {
      const res = await request(app)
        .get(protectedRoute)
        .set('Authorization', 'Bearer ');

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });
  });
});
