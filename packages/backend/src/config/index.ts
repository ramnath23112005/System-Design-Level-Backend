import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '..', '.env') });

const configSchema = z.object({
  app: z.object({
    port: z.coerce.number().default(3000),
    nodeEnv: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    apiPrefix: z.string().default('/api/v1'),
  }),
  db: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(5432),
    name: z.string().default('url_shortener'),
    user: z.string().default('postgres'),
    password: z.string().default('postgres'),
    url: z.string().optional(),
  }),
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(6379),
    password: z.string().optional(),
    url: z.string().optional(),
  }),
  jwt: z.object({
    secret: z.string().default('change-me-secret'),
    expiresIn: z.string().default('15m'),
    refreshSecret: z.string().default('change-me-refresh-secret'),
    refreshExpiresIn: z.string().default('7d'),
    issuer: z.string().default('urlshortener'),
  }),
  aws: z.object({
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    region: z.string().default('us-east-1'),
    s3Bucket: z.string().default('urlshortener-uploads'),
    cloudfrontDomain: z.string().optional(),
  }),
  smtp: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(587),
    user: z.string().optional(),
    pass: z.string().optional(),
    from: z.string().default('noreply@urlshortener.com'),
  }),
  rateLimit: z.object({
    windowMs: z.coerce.number().default(900000),
    max: z.coerce.number().default(100),
  }),
  cors: z.object({
    origin: z.string().default('*'),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  }),
  urls: z.object({
    redirectBaseUrl: z.string().default('http://localhost:3000'),
    apiBaseUrl: z.string().default('http://localhost:3000/api/v1'),
    qrCodeBaseUrl: z.string().default('http://localhost:3000'),
  }),
});

const rawConfig = {
  app: {
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    apiPrefix: process.env.API_PREFIX,
  },
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    url: process.env.REDIS_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    issuer: process.env.JWT_ISSUER,
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    s3Bucket: process.env.AWS_S3_BUCKET,
    cloudfrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  },
  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS,
    max: process.env.RATE_LIMIT_MAX,
  },
  cors: {
    origin: process.env.CORS_ORIGIN,
  },
  logging: {
    level: process.env.LOG_LEVEL,
  },
  urls: {
    redirectBaseUrl: process.env.REDIRECT_BASE_URL,
    apiBaseUrl: process.env.API_BASE_URL,
    qrCodeBaseUrl: process.env.QR_CODE_BASE_URL,
  },
};

export const config = configSchema.parse(rawConfig);

export function validateConfig(): void {
  try {
    configSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`
      );
      throw new Error(`Configuration validation failed:\n${messages.join('\n')}`);
    }
    throw error;
  }
}
