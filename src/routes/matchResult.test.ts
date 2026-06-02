import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../config/env', () => ({
  config: {
    bot: { serviceToken: 'secret-bot-token', webAppUrl: 'https://app.example.com', httpPort: '3000' },
    accountManagement: { serviceToken: 'svc-token', baseUrl: 'http://localhost:8080' },
    engine: { baseUrl: 'http://localhost:8081', serviceToken: 'eng-token' },
    redis: { url: 'redis://localhost:6379' },
    nodeEnv: 'test',
  },
}));
vi.mock('../queue/MatchRegistry', () => ({
  registry: { get: vi.fn(), delete: vi.fn() },
}));

import { registry } from '../queue/MatchRegistry';
import { createMatchResultRouter } from './matchResult';

const registryGetMock = vi.mocked(registry.get);
const registryDeleteMock = vi.mocked(registry.delete);

const matchRecord = {
  player1: { playerId: 'p1', telegramId: 111 },
  player2: { playerId: 'p2', telegramId: 222 },
  createdAt: Date.now(),
};

function makeApp() {
  const bot = { telegram: { sendMessage: vi.fn().mockResolvedValue(undefined) } } as any;
  const app = express();
  app.use(express.json());
  app.use('/matches', createMatchResultRouter(bot));
  return { app, bot };
}

beforeEach(() => {
  vi.resetAllMocks();
});

const validBody = {
  matchId: 'match-uuid',
  participants: [
    { userId: 'p1', placement: 1 },
    { userId: 'p2', placement: 2 },
  ],
  stakeStars: 50,
  reason: 'completed',
};

describe('POST /matches/:id/result', () => {
  it('returns 401 when X-Service-Token is missing', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/matches/match-uuid/result').send(validBody);
    expect(res.status).toBe(401);
  });

  it('returns 401 when X-Service-Token is wrong', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post('/matches/match-uuid/result')
      .set('X-Service-Token', 'wrong-token')
      .send(validBody);
    expect(res.status).toBe(401);
  });

  it('returns 404 when matchId is not in registry', async () => {
    registryGetMock.mockReturnValue(undefined);
    const { app } = makeApp();
    const res = await request(app)
      .post('/matches/match-uuid/result')
      .set('X-Service-Token', 'secret-bot-token')
      .send(validBody);
    expect(res.status).toBe(404);
  });

  it('returns 200 and sends messages to both players', async () => {
    registryGetMock.mockReturnValue(matchRecord);
    const { app, bot } = makeApp();
    const res = await request(app)
      .post('/matches/match-uuid/result')
      .set('X-Service-Token', 'secret-bot-token')
      .send(validBody);
    expect(res.status).toBe(200);
    expect(bot.telegram.sendMessage).toHaveBeenCalledTimes(2);
    expect(registryDeleteMock).toHaveBeenCalledWith('match-uuid');
  });

  it('sends a victory message to placement-1 player and defeat to placement-2', async () => {
    registryGetMock.mockReturnValue(matchRecord);
    const { app, bot } = makeApp();
    await request(app)
      .post('/matches/match-uuid/result')
      .set('X-Service-Token', 'secret-bot-token')
      .send(validBody);

    const calls = (bot.telegram.sendMessage as ReturnType<typeof vi.fn>).mock.calls as [number, string][];
    const winnerCall = calls.find((c) => c[0] === 111);
    const loserCall = calls.find((c) => c[0] === 222);
    expect(winnerCall?.[1]).toContain('🏆');
    expect(loserCall?.[1]).toContain('💔');
  });
});
