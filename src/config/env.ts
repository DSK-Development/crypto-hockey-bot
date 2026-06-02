import * as dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  bot: {
    token: requireEnv('BOT_TOKEN'),
    webAppUrl: requireEnv('WEBAPP_URL'),
    serviceToken: requireEnv('BOT_SERVICE_TOKEN'),
    httpPort: process.env.PORT ?? process.env.BOT_HTTP_PORT ?? '3000',
  },
  accountManagement: {
    baseUrl: requireEnv('ACCOUNT_MANAGEMENT_URL'),
    serviceToken: requireEnv('SERVICE_TOKEN'),
  },
  engine: {
    baseUrl: requireEnv('ENGINE_BASE_URL'),
    serviceToken: requireEnv('ENGINE_SERVICE_TOKEN'),
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  nodeEnv: process.env.NODE_ENV ?? 'development',
} as const;
