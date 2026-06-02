import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./accountService', () => ({ getProfile: vi.fn() }));
vi.mock('../queue/MatchmakingQueue', () => ({
  queue: { enqueue: vi.fn(), getStatus: vi.fn(), dequeue: vi.fn() },
  AlreadyInQueueError: class AlreadyInQueueError extends Error {
    constructor() { super('already'); }
  },
}));
vi.mock('../queue/MatchRegistry', () => ({
  registry: { add: vi.fn() },
}));

import { getProfile } from './accountService';
import { queue, AlreadyInQueueError } from '../queue/MatchmakingQueue';
import { registry } from '../queue/MatchRegistry';
import { enterQueue, getQueueStatus, leaveQueue } from './matchmakingService';
import { JoinLobbyResponse, MatchmakingQueueStatus } from '../types/api';

const profileMock = vi.mocked(getProfile);
const enqueueMock = vi.mocked(queue.enqueue);
const getStatusMock = vi.mocked(queue.getStatus);
const dequeueMock = vi.mocked(queue.dequeue);
const registryAddMock = vi.mocked(registry.add);

const fakeProfile = {
  id: 'p1', telegramId: 123, username: 'alice', firstName: 'Alice',
  level: 1, xp: 0, rating: 1000, status: 'ONLINE' as const,
  isBanned: false, createdAt: '', lastActiveAt: '',
};

beforeEach(() => {
  vi.resetAllMocks();
  profileMock.mockResolvedValue(fakeProfile);
});

describe('enterQueue', () => {
  it('returns matched:false with SEARCHING state when no opponent is waiting', async () => {
    enqueueMock.mockReturnValue({ matched: false });
    const result = await enterQueue(50, 'access-token');
    expect(result.matched).toBe(false);
    expect((result.data as MatchmakingQueueStatus).state).toBe('SEARCHING');
  });

  it('returns matched:true with a full lobby when opponent is found', async () => {
    enqueueMock.mockReturnValue({
      matched: true,
      player1: { playerId: 'p2', telegramId: 456, username: 'bob', accessToken: 't2', joinedAt: Date.now() },
      player2: { playerId: 'p1', telegramId: 123, username: 'alice', accessToken: 'token', joinedAt: Date.now() },
    });

    const result = await enterQueue(50, 'access-token');
    expect(result.matched).toBe(true);

    const lobby = (result.data as JoinLobbyResponse).lobby;
    expect(lobby.stakeAmount).toBe(50);
    expect(lobby.prizePool).toBe(100);
    expect(lobby.players).toHaveLength(2);
    expect(lobby.players[0]!.playerId).toBe('p2');
    expect(lobby.players[1]!.playerId).toBe('p1');
    expect(lobby.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('adds both players to MatchRegistry when matched', async () => {
    enqueueMock.mockReturnValue({
      matched: true,
      player1: { playerId: 'p2', telegramId: 456, username: 'bob', accessToken: 't2', joinedAt: Date.now() },
      player2: { playerId: 'p1', telegramId: 123, username: 'alice', accessToken: 'token', joinedAt: Date.now() },
    });

    const result = await enterQueue(50, 'access-token');
    const matchId = (result.data as JoinLobbyResponse).lobby.id;

    expect(registryAddMock).toHaveBeenCalledWith(matchId, {
      player1: { playerId: 'p2', telegramId: 456 },
      player2: { playerId: 'p1', telegramId: 123 },
      createdAt: expect.any(Number),
    });
  });
});

describe('getQueueStatus', () => {
  it('returns SEARCHING when player is in queue', async () => {
    getStatusMock.mockReturnValue('SEARCHING');
    const status = await getQueueStatus('access-token');
    expect(status.state).toBe('SEARCHING');
    expect(status.playerId).toBe('p1');
  });

  it('returns NOT_IN_QUEUE when player is absent', async () => {
    getStatusMock.mockReturnValue('NOT_IN_QUEUE');
    const status = await getQueueStatus('access-token');
    expect(status.state).toBe('NOT_IN_QUEUE');
  });
});

describe('leaveQueue', () => {
  it('dequeues the player resolved from the access token', async () => {
    await leaveQueue('access-token');
    expect(dequeueMock).toHaveBeenCalledWith('p1');
  });
});
