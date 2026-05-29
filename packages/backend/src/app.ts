import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config';
import { requestLogger } from './middleware';
import { errorHandler } from './middleware/error-handler.middleware';
import apiRoutes from './routes/index';
import redirectRoutes from './routes/redirect.routes';
import { logger } from './utils/logger';

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: config.cors.origin === '*' ? true : config.cors.origin.split(',').map((o) => o.trim()),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
  exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400,
}));

app.use(compression());

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    },
  },
}));

app.use(requestLogger);

app.get(`${config.app.apiPrefix}/health`, (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.app.nodeEnv,
      version: '1.0.0',
    },
    message: 'Service is healthy',
    error: null,
    timestamp: new Date().toISOString(),
  });
});

app.use(config.app.apiPrefix, apiRoutes);

app.use('/', redirectRoutes);

app.get('/qr/:code', (_req: Request, res: Response) => {
  res.redirect(301, `${config.app.apiPrefix}/qr/${_req.params.code}`);
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    data: null,
    message: `Route not found: ${_req.method} ${_req.originalUrl}`,
    error: 'Not Found',
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

export { app };
export default app;
