import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

const sessionKey = (telegramId: number): string => `session:${telegramId}`;

export async function saveSession(telegramId: number, accessToken: string, expiresIn: number): Promise<void> {
  await redis.set(sessionKey(telegramId), accessToken, 'EX', expiresIn);
}

export async function getSession(telegramId: number): Promise<string | null> {
  return redis.get(sessionKey(telegramId));
}

export async function deleteSession(telegramId: number): Promise<void> {
  await redis.del(sessionKey(telegramId));
}

export async function closeRedis(): Promise<void> {
  await redis.quit();
}
