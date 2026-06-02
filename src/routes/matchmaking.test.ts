import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../config/env', () => ({
  config: {
    bot: { serviceToken: 'bot-secret', webAppUrl: 'https://app.example.com', httpPort: '3000' },
    accountManagement: { serviceToken: 'svc-token', baseUrl: 'http://localhost:8080' },
    engine: { baseUrl: 'http://localhost:8081', serviceToken: 'eng-token' },
    redis: { url: 'redis://localhost:6379' },
    nodeEnv: 'test',
  },
}));
vi.mock('../services/accountService', () => ({ getProfile: vi.fn() }));
vi.mock('../services/matchmakingService', () => ({
  enterQueue: vi.fn(),
  getQueueStatus: vi.fn(),
  leaveQueue: vi.fn(),
  AlreadyInQueueError: class AlreadyInQueueError extends Error {
    constructor() { super('already'); }
  },
}));
vi.mock('../services/engineService', () => ({ createEngineMatch: vi.fn() }));
vi.mock('../utils/referral', () => ({
  buildWebAppUrl: vi.fn(() => 'https://app.example.com/game'),
}));
vi.mock('../queue/MatchRegistry', () => ({
  registry: { add: vi.fn(), get: vi.fn(), delete: vi.fn() },
}));

import { getProfile } from '../services/accountService';
import { enterQueue, getQueueStatus, leaveQueue, AlreadyInQueueError } from '../services/matchmakingService';
import { createEngineMatch } from '../services/engineService';
import { registry } from '../queue/MatchRegistry';
import { createMatchmakingRouter } from './matchmaking';

const profileMock = vi.mocked(getProfile);
const enterQueueMock = vi.mocked(enterQueue);
const getQueueStatusMock = vi.mocked(getQueueStatus);
const leaveQueueMock = vi.mocked(leaveQueue);
const createEngineMatchMock = vi.mocked(createEngineMatch);
const registryGetMock = vi.mocked(registry.get);

const fakeProfile = {
  id: 'p1', telegramId: 123, username: 'alice', firstName: 'Alice',
  level: 1, xp: 0, rating: 1000, status: 'ONLINE' as const,
  isBanned: false, createdAt: '', lastActiveAt: '',
};

const fakeLobby = {
  id: 'match-uuid',
  status: 'READY' as const,
  stakeAmount: 50,
  minPlayers: 2,
  maxPlayers: 2,
  currentPlayerCount: 2,
  prizePool: 100,
  players: [
    { playerId: 'p1', username: 'alice', status: 'READY' as const, joinedAt: '' },
    { playerId: 'p2', username: 'bob', status: 'READY' as const, joinedAt: '' },
  ],
  createdAt: '',
  expiresAt: '',
};

const fakeMatchRecord = {
  player1: { playerId: 'p1', telegramId: 123 },
  player2: { playerId: 'p2', telegramId: 456 },
  createdAt: Date.now(),
};

function makeApp() {
  const bot = { telegram: { sendMessage: vi.fn().mockResolvedValue(undefined) } } as any;
  const app = express();
  app.use(express.json());
  app.use('/matchmaking', createMatchmakingRouter(bot));
  return { app, bot };
}

beforeEach(() => {
  vi.resetAllMocks();
  profileMock.mockResolvedValue(fakeProfile);
});

describe('POST /matchmaking/queue', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/matchmaking/queue').send({ stakeAmount: 50 });
    expect(res.status).toBe(401);
  });

  it('returns 202 when player is queued but no opponent is waiting', async () => {
    enterQueueMock.mockResolvedValue({
      matched: false,
      data: { playerId: 'p1', state: 'SEARCHING', stakeAmount: 50, waitingSeconds: 0 },
    });
    const { app } = makeApp();
    const res = await request(app)
      .post('/matchmaking/queue')
      .set('Authorization', 'Bearer token')
      .send({ stakeAmount: 50 });
    expect(res.status).toBe(202);
    expect(res.body.state).toBe('SEARCHING');
  });

  it('returns 200 with lobby and calls createEngineMatch when matched', async () => {
    enterQueueMock.mockResolvedValue({ matched: true, data: { lobby: fakeLobby, invoiceLink: '', invoiceId: '' } });
    createEngineMatchMock.mockResolvedValue(undefined);
    registryGetMock.mockReturnValue(fakeMatchRecord);
    const { app, bot } = makeApp();
    const res = await request(app)
      .post('/matchmaking/queue')
      .set('Authorization', 'Bearer token')
      .send({ stakeAmount: 50 });
    expect(res.status).toBe(200);
    expect(res.body.lobby.id).toBe('match-uuid');
    expect(createEngineMatchMock).toHaveBeenCalledOnce();
    expect(bot.telegram.sendMessage).toHaveBeenCalledTimes(2);
  });

  it('returns 409 when player is already in queue', async () => {
    enterQueueMock.mockRejectedValue(new AlreadyInQueueError());
    const { app } = makeApp();
    const res = await request(app)
      .post('/matchmaking/queue')
      .set('Authorization', 'Bearer token')
      .send({ stakeAmount: 50 });
    expect(res.status).toBe(409);
  });

  it('returns 503 when engine match creation fails', async () => {
    enterQueueMock.mockResolvedValue({ matched: true, data: { lobby: fakeLobby, invoiceLink: '', invoiceId: '' } });
    createEngineMatchMock.mockRejectedValue(new Error('engine down'));
    registryGetMock.mockReturnValue(fakeMatchRecord);
    const { app } = makeApp();
    const res = await request(app)
      .post('/matchmaking/queue')
      .set('Authorization', 'Bearer token')
      .send({ stakeAmount: 50 });
    expect(res.status).toBe(503);
  });

  it('returns 400 for invalid stakeAmount', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post('/matchmaking/queue')
      .set('Authorization', 'Bearer token')
      .send({ stakeAmount: -5 });
    expect(res.status).toBe(400);
  });
});

describe('GET /matchmaking/status', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/matchmaking/status');
    expect(res.status).toBe(401);
  });

  it('returns 200 with queue status', async () => {
    getQueueStatusMock.mockResolvedValue({ playerId: 'p1', state: 'SEARCHING', stakeAmount: 50, waitingSeconds: 5 });
    const { app } = makeApp();
    const res = await request(app)
      .get('/matchmaking/status')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('SEARCHING');
  });
});

describe('DELETE /matchmaking/queue', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const { app } = makeApp();
    const res = await request(app).delete('/matchmaking/queue');
    expect(res.status).toBe(401);
  });

  it('returns 204 and calls leaveQueue with the bearer token', async () => {
    leaveQueueMock.mockResolvedValue(undefined);
    const { app } = makeApp();
    const res = await request(app)
      .delete('/matchmaking/queue')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(204);
    expect(leaveQueueMock).toHaveBeenCalledWith('token');
  });
});
