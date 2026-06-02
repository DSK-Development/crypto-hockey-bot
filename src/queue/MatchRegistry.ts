export type MatchRecord = {
  player1: { playerId: string; telegramId: number };
  player2: { playerId: string; telegramId: number };
  createdAt: number;
};

export class MatchRegistry {
  private records = new Map<string, MatchRecord>();
  private sweepTimer: ReturnType<typeof setInterval>;

  constructor(private readonly ttlMs = 3 * 60 * 60 * 1000, sweepMs = 10 * 60 * 1000) {
    this.sweepTimer = setInterval(() => this.sweep(), sweepMs);
  }

  add(matchId: string, record: MatchRecord): void {
    this.records.set(matchId, record);
  }

  get(matchId: string): MatchRecord | undefined {
    return this.records.get(matchId);
  }

  delete(matchId: string): void {
    this.records.delete(matchId);
  }

  private sweep(): void {
    const cutoff = Date.now() - this.ttlMs;
    for (const [id, record] of this.records.entries()) {
      if (record.createdAt < cutoff) this.records.delete(id);
    }
  }

  destroy(): void {
    clearInterval(this.sweepTimer);
  }
}

export const registry = new MatchRegistry();
