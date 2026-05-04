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
  },
  accountManagement: {
    baseUrl: requireEnv('ACCOUNT_MANAGEMENT_URL'),
  },
  nodeEnv: process.env.NODE_ENV ?? 'development',
} as const;
