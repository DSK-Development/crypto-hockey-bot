import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MatchmakingQueue, AlreadyInQueueError, QueueEntry } from './MatchmakingQueue';

const makeEntry = (playerId: string): QueueEntry => ({
  playerId,
  telegramId: 100,
  username: 'user',
  accessToken: 'token',
  joinedAt: Date.now(),
});

describe('MatchmakingQueue', () => {
  let q: MatchmakingQueue;

  beforeEach(() => { q = new MatchmakingQueue(60_000, 999_999); });
  afterEach(() => { q.destroy(); });

  it('parks player in empty slot and returns matched:false', () => {
    const result = q.enqueue(50, makeEntry('p1'));
    expect(result.matched).toBe(false);
  });

  it('matches two different players at the same stake', () => {
    q.enqueue(50, makeEntry('p1'));
    const result = q.enqueue(50, makeEntry('p2'));
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.player1.playerId).toBe('p1');
      expect(result.player2.playerId).toBe('p2');
    }
  });

  it('does not match players at different stakes', () => {
    q.enqueue(50, makeEntry('p1'));
    const result = q.enqueue(100, makeEntry('p2'));
    expect(result.matched).toBe(false);
    expect(q.getStatus('p1')).toBe('SEARCHING');
    expect(q.getStatus('p2')).toBe('SEARCHING');
  });

  it('throws AlreadyInQueueError when same player enqueues twice', () => {
    q.enqueue(50, makeEntry('p1'));
    expect(() => q.enqueue(50, makeEntry('p1'))).toThrow(AlreadyInQueueError);
  });

  it('getStatus returns SEARCHING for queued player', () => {
    q.enqueue(50, makeEntry('p1'));
    expect(q.getStatus('p1')).toBe('SEARCHING');
  });

  it('getStatus returns NOT_IN_QUEUE for absent player', () => {
    expect(q.getStatus('ghost')).toBe('NOT_IN_QUEUE');
  });

  it('dequeue removes player from slot', () => {
    q.enqueue(50, makeEntry('p1'));
    q.dequeue('p1');
    expect(q.getStatus('p1')).toBe('NOT_IN_QUEUE');
  });

  it('dequeue is a no-op for absent player', () => {
    expect(() => q.dequeue('ghost')).not.toThrow();
  });

  it('sweep evicts entries older than TTL', () => {
    const q2 = new MatchmakingQueue(100, 999_999);
    q2.enqueue(50, { ...makeEntry('p1'), joinedAt: Date.now() - 200 });
    (q2 as any).sweep();
    expect(q2.getStatus('p1')).toBe('NOT_IN_QUEUE');
    q2.destroy();
  });
});
