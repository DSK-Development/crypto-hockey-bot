export class AlreadyInQueueError extends Error {
  constructor() { super('Player already in queue'); }
}

export type QueueEntry = {
  playerId: string;
  telegramId: number;
  username: string;
  accessToken: string;
  joinedAt: number;
};

export type EnqueueResult =
  | { matched: false }
  | { matched: true; player1: QueueEntry; player2: QueueEntry };

export class MatchmakingQueue {
  private slots = new Map<number, QueueEntry>();
  private sweepTimer: ReturnType<typeof setInterval>;

  constructor(private readonly ttlMs = 60_000, sweepMs = 30_000) {
    this.sweepTimer = setInterval(() => this.sweep(), sweepMs);
  }

  enqueue(stakeAmount: number, entry: QueueEntry): EnqueueResult {
    const existing = this.slots.get(stakeAmount);
    if (existing) {
      if (existing.playerId === entry.playerId) throw new AlreadyInQueueError();
      this.slots.delete(stakeAmount);
      return { matched: true, player1: existing, player2: entry };
    }
    this.slots.set(stakeAmount, entry);
    return { matched: false };
  }

  getStatus(playerId: string): 'SEARCHING' | 'NOT_IN_QUEUE' {
    for (const entry of this.slots.values()) {
      if (entry.playerId === playerId) return 'SEARCHING';
    }
    return 'NOT_IN_QUEUE';
  }

  dequeue(playerId: string): void {
    for (const [stake, entry] of this.slots.entries()) {
      if (entry.playerId === playerId) { this.slots.delete(stake); return; }
    }
  }

  private sweep(): void {
    const cutoff = Date.now() - this.ttlMs;
    for (const [stake, entry] of this.slots.entries()) {
      if (entry.joinedAt < cutoff) this.slots.delete(stake);
    }
  }

  destroy(): void {
    clearInterval(this.sweepTimer);
  }
}

export const queue = new MatchmakingQueue();
