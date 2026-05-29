import { format as dateFnsFormat, formatDistanceToNow, differenceInDays, differenceInHours } from 'date-fns';

export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function formatDate(date: string | Date, fmt: string = 'MMM d, yyyy'): string {
  return dateFnsFormat(new Date(date), fmt);
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m ${secs}s`;
}

export function truncateUrl(url: string, maxLen: number = 50): string {
  if (url.length <= maxLen) return url;
  const half = Math.floor((maxLen - 3) / 2);
  return `${url.slice(0, half)}...${url.slice(url.length - half)}`;
}

export function formatCountry(country: string): string {
  if (country === 'US') return 'United States';
  if (country === 'GB') return 'United Kingdom';
  if (country === 'CA') return 'Canada';
  if (country === 'AU') return 'Australia';
  if (country === 'DE') return 'Germany';
  if (country === 'FR') return 'France';
  if (country === 'IN') return 'India';
  if (country === 'BR') return 'Brazil';
  if (country === 'JP') return 'Japan';
  if (country === 'CN') return 'China';
  if (country === 'RU') return 'Russia';
  if (country === 'Unknown' || !country) return 'Unknown';
  return country;
}

export function formatDeviceIcon(device: string): string {
  const d = device.toLowerCase();
  if (d.includes('mobile') || d.includes('iphone') || d.includes('android')) return 'smartphone';
  if (d.includes('tablet') || d.includes('ipad')) return 'tablet';
  if (d.includes('desktop') || d.includes('windows') || d.includes('mac')) return 'monitor';
  return 'globe';
}

export function clickColor(rate: number): string {
  if (rate >= 70) return 'text-success-500';
  if (rate >= 40) return 'text-warning-500';
  return 'text-danger-500';
}

export function statusBadge(isActive: boolean): { label: string; color: string } {
  return isActive
    ? { label: 'Active', color: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' }
    : { label: 'Inactive', color: 'bg-secondary-100 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-400' };
}

export function daysUntil(date: string | Date): number {
  return differenceInDays(new Date(date), new Date());
}

export function hoursUntil(date: string | Date): number {
  return differenceInHours(new Date(date), new Date());
}

export function shortId(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
