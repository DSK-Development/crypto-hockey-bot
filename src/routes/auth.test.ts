import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../services/accountService', () => ({
  authTelegram: vi.fn(),
}));

vi.mock('../session/sessionStore', () => ({
  saveSession: vi.fn(),
}));

import { authTelegram } from '../services/accountService';
import { saveSession } from '../session/sessionStore';
import { createAuthRouter } from './auth';

const authTelegramMock = vi.mocked(authTelegram);
const saveSessionMock = vi.mocked(saveSession);

function app() {
  const a = express();
  a.use(express.json());
  a.use('/auth', createAuthRouter());
  return a;
}

describe('POST /auth/session', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 400 when initData is missing', async () => {
    const res = await request(app()).post('/auth/session').send({});
    expect(res.status).toBe(400);
  });

  it('saves session and returns 200 on valid initData', async () => {
    authTelegramMock.mockResolvedValue({
      accessToken: 'tok',
      refreshToken: '',
      expiresIn: 900,
      player: {
        id: 'p1',
        telegramId: 42,
        username: 'alice',
        firstName: 'Alice',
        level: 1,
        xp: 0,
        rating: 0,
        status: 'ONLINE',
        isBanned: false,
        createdAt: '',
        lastActiveAt: '',
      },
    });
    saveSessionMock.mockResolvedValue(undefined);

    const res = await request(app())
      .post('/auth/session')
      .send({ initData: 'user=...&hash=abc' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(saveSessionMock).toHaveBeenCalledWith(42, 'tok', 900);
  });

  it('returns 401 when account auth fails', async () => {
    authTelegramMock.mockRejectedValue(new Error('invalid'));

    const res = await request(app())
      .post('/auth/session')
      .send({ initData: 'bad' });

    expect(res.status).toBe(401);
  });
});
