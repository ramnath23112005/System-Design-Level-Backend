export interface IUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'user' | 'admin';
  apiKey: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILink {
  id: string;
  userId: string;
  originalUrl: string;
  shortCode: string;
  customAlias: string | null;
  title: string | null;
  tags: string[];
  isActive: boolean;
  expiresAt: Date | null;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClickEvent {
  id: string;
  linkId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string | null;
  referer: string | null;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  deviceType: string | null;
  deviceModel: string | null;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export interface IApiKey {
  id: string;
  userId: string;
  key: string;
  name: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface IAnalyticsSummary {
  totalClicks: number;
  uniqueVisitors: number;
  topCountries: { country: string; count: number }[];
  topBrowsers: { browser: string; count: number }[];
  topDevices: { deviceType: string; count: number }[];
  topReferrers: { referer: string; count: number }[];
  clicksOverTime: { date: string; count: number }[];
}

export interface ICreateLinkInput {
  originalUrl: string;
  customAlias?: string;
  title?: string;
  tags?: string[];
  expiresAt?: Date;
  password?: string;
}

export interface IUpdateLinkInput {
  originalUrl?: string;
  title?: string;
  tags?: string[];
  isActive?: boolean;
  expiresAt?: Date | null;
  password?: string | null;
}

export interface IRegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface ILoginInput {
  email: string;
  password: string;
}

export interface IPaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IPaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface IApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  error: string | null;
  timestamp: string;
}

export interface IDatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  dialect: 'postgres' | 'mysql' | 'sqlite';
  pool: {
    min: number;
    max: number;
    acquire: number;
    idle: number;
  };
  logging: boolean;
  ssl: boolean;
}

export interface IRedisConfig {
  host: string;
  port: number;
  password: string | null;
  db: number;
  keyPrefix: string;
  ttl: {
    default: number;
    links: number;
    users: number;
    analytics: number;
    rateLimit: number;
  };
  enableCluster: boolean;
  clusterNodes: { host: string; port: number }[];
}

export interface IJwtConfig {
  secret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  issuer: string;
  audience: string;
  algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256';
}

export interface IAwsConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  s3: {
    bucket: string;
    endpoint: string;
    forcePathStyle: boolean;
    presignedUrlExpiry: number;
  };
  cloudfront: {
    domain: string;
    keyPairId: string;
    privateKey: string;
  };
  sqs: {
    queueUrl: string;
    region: string;
  };
}

export interface IAppConfig {
  env: 'development' | 'staging' | 'production' | 'test';
  port: number;
  host: string;
  apiPrefix: string;
  corsOrigins: string[];
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  baseUrl: string;
  shortCodeLength: number;
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    trustProxy: boolean;
  };
  encryption: {
    algorithm: string;
    key: string;
    iv: string;
  };
  db: IDatabaseConfig;
  redis: IRedisConfig;
  jwt: IJwtConfig;
  aws: IAwsConfig;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}
