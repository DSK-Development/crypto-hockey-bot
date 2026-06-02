import { describe, it, expect, vi } from 'vitest';

vi.mock('../session/sessionStore', () => ({
  getSession: vi.fn(),
  saveSession: vi.fn(),
  deleteSession: vi.fn(),
}));
vi.mock('../services/accountService', () => ({ holdStake: vi.fn() }));
vi.mock('../services/matchmakingService', () => ({
  enterQueue: vi.fn(),
  pollUntilMatched: vi.fn(),
  leaveQueue: vi.fn(),
}));
vi.mock('../services/engineService', () => ({ createEngineMatch: vi.fn() }));
vi.mock('../utils/referral', () => ({
  buildWebAppUrl: vi.fn(() => 'https://app.example.com/game'),
  parseReferralCode: vi.fn(),
}));
vi.mock('../config/env', () => ({
  config: {
    accountManagement: { serviceToken: 'svc-token' },
    bot: { webAppUrl: 'https://app.example.com' },
    engine: { baseUrl: 'http://localhost:8081', serviceToken: 'engine-token' },
  },
}));

import { parseMatchFindCallback } from './matchmakingHandler';

describe('parseMatchFindCallback', () => {
  it('returns the stake amount for valid callback data', () => {
    expect(parseMatchFindCallback('match:find:50')).toBe(50);
    expect(parseMatchFindCallback('match:find:100')).toBe(100);
    expect(parseMatchFindCallback('match:find:10')).toBe(10);
  });

  it('returns null for wrong prefix', () => {
    expect(parseMatchFindCallback('stake:10')).toBeNull();
    expect(parseMatchFindCallback('other:find:50')).toBeNull();
  });

  it('returns null for non-numeric amount', () => {
    expect(parseMatchFindCallback('match:find:abc')).toBeNull();
  });

  it('returns null for zero amount', () => {
    expect(parseMatchFindCallback('match:find:0')).toBeNull();
  });

  it('returns null for negative amount', () => {
    expect(parseMatchFindCallback('match:find:-5')).toBeNull();
  });
});
