import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MatchRegistry, MatchRecord } from './MatchRegistry';

const makeRecord = (): MatchRecord => ({
  player1: { playerId: 'p1', telegramId: 111 },
  player2: { playerId: 'p2', telegramId: 222 },
  createdAt: Date.now(),
});

describe('MatchRegistry', () => {
  let reg: MatchRegistry;

  beforeEach(() => { reg = new MatchRegistry(3_600_000, 999_999); });
  afterEach(() => { reg.destroy(); });

  it('stores and retrieves a record', () => {
    const rec = makeRecord();
    reg.add('match1', rec);
    expect(reg.get('match1')).toEqual(rec);
  });

  it('returns undefined for unknown match', () => {
    expect(reg.get('unknown')).toBeUndefined();
  });

  it('deletes a record', () => {
    reg.add('match1', makeRecord());
    reg.delete('match1');
    expect(reg.get('match1')).toBeUndefined();
  });

  it('sweep evicts stale records', () => {
    const r2 = new MatchRegistry(100, 999_999);
    r2.add('match1', { ...makeRecord(), createdAt: Date.now() - 200 });
    (r2 as any).sweep();
    expect(r2.get('match1')).toBeUndefined();
    r2.destroy();
  });
});
