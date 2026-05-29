import { IUser, ILink, IPaginatedResponse } from '@urlshortener/shared';
import { randomBytes } from 'crypto';
import UAParser from 'ua-parser-js';
import geoip from 'geoip-lite';

export function parseUserAgent(ua: string): {
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  deviceType: string | null;
  deviceModel: string | null;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
} {
  try {
    const parser = new UAParser(ua);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();

    const deviceType = device.type || 'desktop';

    return {
      browser: browser.name || null,
      browserVersion: browser.version || null,
      os: os.name || null,
      osVersion: os.version || null,
      deviceType,
      deviceModel: device.model || null,
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop' || !device.type,
    };
  } catch {
    return {
      browser: null,
      browserVersion: null,
      os: null,
      osVersion: null,
      deviceType: null,
      deviceModel: null,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
    };
  }
}

export function getGeoFromIP(ip: string): {
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
} {
  try {
    const geo = geoip.lookup(ip);
    if (!geo) {
      return { country: null, city: null, latitude: null, longitude: null };
    }
    return {
      country: geo.country || null,
      city: geo.city || null,
      latitude: geo.ll?.[0] ?? null,
      longitude: geo.ll?.[1] ?? null,
    };
  } catch {
    return { country: null, city: null, latitude: null, longitude: null };
  }
}

export function sanitizeUser(user: IUser): Omit<IUser, 'passwordHash' | 'apiKey'> & { passwordHash?: undefined; apiKey?: undefined } {
  const { passwordHash, apiKey, ...safe } = user;
  return safe;
}

export function sanitizeLink(link: ILink): Omit<ILink, 'password'> & { password?: undefined } {
  const { password, ...safe } = link;
  return safe;
}

export function buildPaginationObject(
  total: number,
  page: number,
  limit: number
): {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function generateApiKey(length: number = 64): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

export function isValidDate(date: unknown): date is Date {
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  if (typeof date === 'string' || typeof date === 'number') {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }
  return false;
}

export function calculateExpiryDate(duration: string): Date | null {
  const match = duration.match(/^(\d+)\s*(s|m|h|d|w|M|y)$/);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const now = new Date();

  switch (unit) {
    case 's': return new Date(now.getTime() + value * 1000);
    case 'm': return new Date(now.getTime() + value * 60000);
    case 'h': return new Date(now.getTime() + value * 3600000);
    case 'd': return new Date(now.getTime() + value * 86400000);
    case 'w': return new Date(now.getTime() + value * 604800000);
    case 'M': return new Date(now.setMonth(now.getMonth() + value));
    case 'y': return new Date(now.setFullYear(now.getFullYear() + value));
    default: return null;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
