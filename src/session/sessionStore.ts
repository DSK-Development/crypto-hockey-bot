interface Session {
  accessToken: string;
  expiresAt: number;
}

const store = new Map<number, Session>();

export function saveSession(telegramId: number, accessToken: string, expiresIn: number): void {
  store.set(telegramId, {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  });
}

export function getSession(telegramId: number): string | null {
  const session = store.get(telegramId);
  if (!session) return null;
  if (Date.now() >= session.expiresAt) {
    store.delete(telegramId);
    return null;
  }
  return session.accessToken;
}

export function deleteSession(telegramId: number): void {
  store.delete(telegramId);
}
