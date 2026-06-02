import * as dotenv from 'dotenv';

dotenv.config();

type BotUpdateMode = 'polling' | 'webhook';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

function readBotUpdateMode(): BotUpdateMode {
  const mode = optionalEnv('BOT_UPDATE_MODE');
  if (!mode) return optionalEnv('BOT_WEBHOOK_URL') ? 'webhook' : 'polling';
  if (mode === 'polling' || mode === 'webhook') return mode;
  throw new Error('BOT_UPDATE_MODE must be either "polling" or "webhook"');
}

export const config = {
  bot: {
    token: requireEnv('BOT_TOKEN'),
    webAppUrl: requireEnv('WEBAPP_URL'),
    serviceToken: requireEnv('BOT_SERVICE_TOKEN'),
    httpPort: process.env.PORT ?? process.env.BOT_HTTP_PORT ?? '3000',
    updateMode: readBotUpdateMode(),
    webhookUrl: optionalEnv('BOT_WEBHOOK_URL')?.replace(/\/+$/, ''),
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
