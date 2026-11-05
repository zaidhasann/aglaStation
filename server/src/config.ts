import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  ENABLE_DEV_TOOLS: process.env.ENABLE_DEV_TOOLS === 'true',
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'nextstation-secret-admin-token',
  STATION_ADVANCE_INTERVAL_MS: parseInt(process.env.STATION_ADVANCE_INTERVAL_MS || '120000', 10), // 2 minutes
  RESYNC_INTERVAL_MS: 30000, // 30 seconds
  MAX_MESSAGE_LENGTH: 300,
  RATE_LIMIT_MAX_MESSAGES: 5,
  RATE_LIMIT_WINDOW_MS: 10000, // 5 messages per 10 seconds
  RATE_LIMIT_REQUESTS_MAX: 3,
  RATE_LIMIT_REQUESTS_WINDOW_MS: 60000, // 3 chat requests per minute
  RATE_LIMIT_JOINS_MAX: 10,
  RATE_LIMIT_JOINS_WINDOW_MS: 60000, // 10 joins per minute
};
