import Redis from 'ioredis';

export class SessionStoreError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'SessionStoreError';
  }
}

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  connectTimeout: 5_000,
});

redis.on('error', (err) => {
  console.error('[redis] connection error:', err.message);
});

const sessionKey = (telegramId: number): string => `session:${telegramId}`;

export async function saveSession(telegramId: number, accessToken: string, expiresIn: number): Promise<void> {
  const ttl = Math.max(1, Math.floor(expiresIn));
  try {
    await redis.set(sessionKey(telegramId), accessToken, 'EX', ttl);
  } catch (err) {
    throw new SessionStoreError(`Redis unavailable (${redisUrl})`, err);
  }
}

export async function getSession(telegramId: number): Promise<string | null> {
  try {
    return await redis.get(sessionKey(telegramId));
  } catch (err) {
    throw new SessionStoreError(`Redis unavailable (${redisUrl})`, err);
  }
}

export async function deleteSession(telegramId: number): Promise<void> {
  try {
    await redis.del(sessionKey(telegramId));
  } catch (err) {
    throw new SessionStoreError(`Redis unavailable (${redisUrl})`, err);
  }
}

export async function closeRedis(): Promise<void> {
  await redis.quit();
}
