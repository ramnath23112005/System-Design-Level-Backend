import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

const logDir = path.resolve(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const requestIdFormat = winston.format((info) => {
  if (info.requestId) {
    info.message = `[${info.requestId}] ${info.message}`;
  }
  return info;
});

const consoleFormat = config.app.nodeEnv === 'development'
  ? winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
        const rid = requestId ? ` [${requestId}]` : '';
        const metaStr = Object.keys(meta).length > 1
          ? ` ${JSON.stringify(meta)}`
          : '';
        return `${timestamp} [${level}]${rid}: ${message}${metaStr}`;
      })
    )
  : winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    );

export const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    requestIdFormat(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'urlshortener' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 10,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 10,
    }),
  ],
  exitOnError: false,
});
