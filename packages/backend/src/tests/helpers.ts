import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { UserModel, LinkModel, ClickEventModel } from '../models';
import { query } from '../database';
import { IUser, ILink, IRegisterInput, ICreateLinkInput } from '@urlshortener/shared';

interface TestUserData {
  email: string;
  password: string;
  name: string;
}

interface TestLinkData {
  originalUrl: string;
  customAlias?: string;
  title?: string;
  tags?: string[];
}

export async function createTestUser(
  overrides: Partial<IRegisterInput> = {}
): Promise<{ user: IUser; token: string; refreshToken: string }> {
  const email = overrides.email || `test-${uuidv4().slice(0, 8)}@example.com`;
  const password = overrides.password || 'TestPass123!';
  const name = overrides.name || 'Test User';

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = uuidv4();
  const apiKey = `uk_test_${uuidv4().replace(/-/g, '')}`;

  const user = await UserModel.create({
    id: userId,
    email,
    passwordHash,
    name,
    apiKey,
  });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn, issuer: config.jwt.issuer }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, role: user.role, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn, issuer: config.jwt.issuer }
  );

  return { user, token, refreshToken };
}

export async function createTestLink(
  userId: string,
  overrides: Partial<ICreateLinkInput> = {}
): Promise<ILink> {
  const shortCode = `tst${uuidv4().slice(0, 4)}`;
  const link = await LinkModel.create({
    id: uuidv4(),
    userId,
    input: {
      originalUrl: overrides.originalUrl || 'https://example.com',
      customAlias: overrides.customAlias,
      title: overrides.title || 'Test Link',
      tags: overrides.tags || ['test'],
    },
    shortCode,
  });

  return link;
}

export async function createTestLinkWithPassword(
  userId: string,
  password: string = 'secret123'
): Promise<ILink> {
  const passwordHash = await bcrypt.hash(password, 10);
  const shortCode = `pwd${uuidv4().slice(0, 4)}`;
  const link = await LinkModel.create({
    id: uuidv4(),
    userId,
    input: {
      originalUrl: 'https://example-password.com',
      title: 'Password Protected Link',
    },
    shortCode,
    passwordHash,
  });

  return link;
}

export async function createTestClickEvent(
  linkId: string,
  overrides: {
    country?: string;
    city?: string;
    browser?: string;
    deviceType?: string;
    referer?: string;
  } = {}
): Promise<void> {
  await ClickEventModel.create({
    id: uuidv4(),
    linkId,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 TestAgent',
    referer: overrides.referer || 'https://google.com',
    country: overrides.country || 'US',
    city: overrides.city || 'New York',
    browser: overrides.browser || 'Chrome',
    browserVersion: '120.0',
    os: 'Windows',
    osVersion: '10',
    deviceType: overrides.deviceType || 'desktop',
    deviceModel: 'PC',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  });
}

export function getAuthToken(token?: string): { Authorization: string } | {} {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function cleanDatabase(): Promise<void> {
  await query('DELETE FROM click_events');
  await query('DELETE FROM links');
  await query('DELETE FROM api_keys');
  await query('DELETE FROM users');
}

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  const { pool } = require('../database');
  await pool.end();
});
