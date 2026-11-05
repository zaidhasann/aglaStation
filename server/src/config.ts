import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  STATION_ADVANCE_INTERVAL_MS: parseInt(process.env.STATION_ADVANCE_INTERVAL_MS || '120000', 10), // 2 minutes
  RESYNC_INTERVAL_MS: 30000, // 30 seconds
  MAX_MESSAGE_LENGTH: 300,
  RATE_LIMIT_MAX_MESSAGES: 5,
  RATE_LIMIT_WINDOW_MS: 10000, // 5 messages per 10 seconds
};
