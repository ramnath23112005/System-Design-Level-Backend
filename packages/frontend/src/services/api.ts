import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

interface FailedRequest {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    const apiKey = localStorage.getItem('apiKey');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (apiKey && config.headers) {
      config.headers['X-API-Key'] = apiKey;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const newToken = data.accessToken;
        localStorage.setItem('accessToken', newToken);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        processQueue(null, newToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  apiKey?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Link {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  title?: string;
  tags?: string[];
  clicks: number;
  uniqueClicks: number;
  isActive: boolean;
  hasPassword: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt?: string;
  userId?: string;
}

export interface ClickEvent {
  id: string;
  linkId: string;
  ip: string;
  country: string;
  city: string;
  device: string;
  browser: string;
  os: string;
  referrer: string;
  userAgent: string;
  timestamp: string;
}

export interface DashboardStats {
  totalLinks: number;
  totalClicks: number;
  activeLinks: number;
  clickRate: number;
  clicksOverTime: { date: string; clicks: number }[];
  topLinks: Link[];
  geoData: { country: string; clicks: number; lat: number; lng: number }[];
  deviceData: { name: string; value: number }[];
  browserData: { name: string; value: number }[];
  recentClicks: ClickEvent[];
  realTimeClicks: number;
}

export interface LinkAnalytics {
  summary: {
    totalClicks: number;
    uniqueClicks: number;
    uniqueVisitors: number;
    averageTime: number;
    bounceRate: number;
  };
  timeline: { date: string; clicks: number }[];
  geo: { country: string; clicks: number; lat: number; lng: number }[];
  devices: { name: string; value: number }[];
  browsers: { name: string; value: number }[];
  referrers: { source: string; clicks: number; percentage: number }[];
  os: { name: string; value: number }[];
}

export interface AdminStats {
  totalUsers: number;
  totalLinks: number;
  totalClicks: number;
  activeToday: number;
  storageUsed: string;
  uptime: string;
}

export interface SystemHealth {
  database: { status: 'healthy' | 'degraded' | 'down'; latency: number };
  redis: { status: 'healthy' | 'degraded' | 'down'; latency: number };
  queue: { status: 'healthy' | 'degraded' | 'down'; jobs: number };
}

export interface ActivityLog {
  id: string;
  action: string;
  userId: string;
  userName: string;
  details: string;
  ip: string;
  timestamp: string;
}

export interface ServerLog {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  module: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiKeyData {
  key: string;
  name: string;
  createdAt: string;
  lastUsed?: string;
  isActive: boolean;
}

export const authApi = {
  register: (data: RegisterData) => api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', data),
  login: (data: LoginData) => api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refreshToken: string) => api.post<{ accessToken: string; refreshToken?: string }>('/auth/refresh', { refreshToken }),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.put('/auth/change-password', data),
};

export const linksApi = {
  create: (data: Partial<Link> & { originalUrl: string }) => api.post<Link>('/links', data),
  getAll: (params?: { page?: number; limit?: number; search?: string; sort?: string; order?: string }) =>
    api.get<PaginatedResponse<Link>>('/links', { params }),
  getById: (id: string) => api.get<Link>(`/links/${id}`),
  update: (id: string, data: Partial<Link>) => api.put<Link>(`/links/${id}`, data),
  delete: (id: string) => api.delete(`/links/${id}`),
  getAnalytics: (id: string, params?: { startDate?: string; endDate?: string }) =>
    api.get<LinkAnalytics>(`/links/${id}/analytics`, { params }),
};

export const analyticsApi = {
  getDashboard: () => api.get<DashboardStats>('/analytics/dashboard'),
  getClicks: (params?: { startDate?: string; endDate?: string; linkId?: string }) =>
    api.get<{ date: string; clicks: number }[]>('/analytics/clicks', { params }),
  getGeo: (params?: { startDate?: string; endDate?: string }) =>
    api.get<{ country: string; clicks: number; lat: number; lng: number }[]>('/analytics/geo', { params }),
  getDevices: (params?: { startDate?: string; endDate?: string }) =>
    api.get<{ name: string; value: number }[]>('/analytics/devices', { params }),
  getTimeline: (params?: { startDate?: string; endDate?: string; interval?: string }) =>
    api.get<{ date: string; clicks: number }[]>('/analytics/timeline', { params }),
  getReferrers: (params?: { startDate?: string; endDate?: string }) =>
    api.get<{ source: string; clicks: number; percentage: number }[]>('/analytics/referrers', { params }),
  getRealTime: () => api.get<{ activeVisitors: number; clicksToday: number }>('/analytics/realtime'),
  exportData: (params: { format: 'csv' | 'json'; startDate?: string; endDate?: string }) =>
    api.get('/analytics/export', { params, responseType: 'blob' }),
};

export const userApi = {
  getProfile: () => api.get<User>('/user/profile'),
  updateProfile: (data: { name?: string; email?: string }) => api.put<User>('/user/profile', data),
  getApiKeys: () => api.get<ApiKeyData[]>('/user/api-keys'),
  createApiKey: (name: string) => api.post<ApiKeyData>('/user/api-keys', { name }),
  revokeApiKey: (keyId: string) => api.delete(`/user/api-keys/${keyId}`),
};

export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/stats'),
  getActivity: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<ActivityLog>>('/admin/activity', { params }),
  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<User>>('/admin/users', { params }),
  manageUser: (userId: string, data: { action: 'activate' | 'deactivate' | 'delete' }) =>
    api.post(`/admin/users/${userId}/manage`, data),
  getHealth: () => api.get<SystemHealth>('/admin/health'),
  getLogs: (params?: { level?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<ServerLog>>('/admin/logs', { params }),
};

export default api;
