import { SHORT_CODE_LENGTH } from '../constants';

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateShortCode(length: number = SHORT_CODE_LENGTH): string {
  if (length < 1) {
    throw new Error('Length must be at least 1');
  }
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
  }
  return result;
}

export function isValidUrl(url: string): boolean {
  if (typeof url !== 'string' || url.trim().length === 0) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidCustomAlias(alias: string): boolean {
  if (typeof alias !== 'string') {
    return false;
  }
  return /^[a-zA-Z0-9_-]{4,20}$/.test(alias);
}

const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

const SANITIZE_REGEX = /[&<>"'/]/g;

export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input.replace(SANITIZE_REGEX, (char) => HTML_ENTITY_MAP[char]);
}

export function maskEmail(email: string): string {
  if (typeof email !== 'string' || !email.includes('@')) {
    return email;
  }
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  const visible = local.slice(0, 2);
  const masked = '*'.repeat(Math.min(local.length - 2, 6));
  return `${visible}${masked}@${domain}`;
}

export function truncate(str: string, len: number): string {
  if (typeof str !== 'string') {
    return '';
  }
  if (len < 1) {
    return '';
  }
  if (str.length <= len) {
    return str;
  }
  return str.slice(0, len).trimEnd() + '...';
}
