import { useQuery } from 'react-query';
import { analyticsApi, DashboardStats, LinkAnalytics } from '@/services/api';

export function useDashboard() {
  return useQuery<DashboardStats>(
    'dashboard',
    () => analyticsApi.getDashboard().then((r) => r.data),
    { refetchInterval: 30000 }
  );
}

export function useClicksTimeline(params?: { startDate?: string; endDate?: string; interval?: string }) {
  return useQuery(
    ['clicksTimeline', params],
    () => analyticsApi.getTimeline(params).then((r) => r.data)
  );
}

export function useGeoData(params?: { startDate?: string; endDate?: string }) {
  return useQuery(
    ['geoData', params],
    () => analyticsApi.getGeo(params).then((r) => r.data)
  );
}

export function useDeviceData(params?: { startDate?: string; endDate?: string }) {
  return useQuery(
    ['deviceData', params],
    () => analyticsApi.getDevices(params).then((r) => r.data)
  );
}

export function useReferrers(params?: { startDate?: string; endDate?: string }) {
  return useQuery(
    ['referrers', params],
    () => analyticsApi.getReferrers(params).then((r) => r.data)
  );
}

export function useRealTime() {
  return useQuery(
    'realTime',
    () => analyticsApi.getRealTime().then((r) => r.data),
    { refetchInterval: 10000 }
  );
}

export function useExportData(params: { format: 'csv' | 'json'; startDate?: string; endDate?: string }) {
  return useQuery(
    ['exportData', params],
    () => analyticsApi.exportData(params).then((r) => r.data),
    { enabled: false }
  );
}
