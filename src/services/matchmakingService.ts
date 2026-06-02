import { getProfile } from './accountService';
import { queue, AlreadyInQueueError, QueueEntry } from '../queue/MatchmakingQueue';
import { registry } from '../queue/MatchRegistry';
import { JoinLobbyResponse, MatchmakingQueueStatus, LobbyPlayer } from '../types/api';

export { AlreadyInQueueError };

export async function enterQueue(
  stakeAmount: number,
  accessToken: string,
): Promise<{ matched: boolean; data: JoinLobbyResponse | MatchmakingQueueStatus }> {
  const profile = await getProfile(accessToken);
  const entry: QueueEntry = {
    playerId: profile.id,
    telegramId: profile.telegramId,
    username: profile.username || `player_${profile.id.slice(0, 6)}`,
    accessToken,
    joinedAt: Date.now(),
  };

  const result = queue.enqueue(stakeAmount, entry);

  if (!result.matched) {
    return {
      matched: false,
      data: {
        playerId: profile.id,
        state: 'SEARCHING',
        stakeAmount,
        waitingSeconds: 0,
      } satisfies MatchmakingQueueStatus,
    };
  }

  const matchId = crypto.randomUUID();
  const { player1, player2 } = result;

  registry.add(matchId, {
    player1: { playerId: player1.playerId, telegramId: player1.telegramId },
    player2: { playerId: player2.playerId, telegramId: player2.telegramId },
    createdAt: Date.now(),
  });

  const toPlayer = (e: QueueEntry): LobbyPlayer => ({
    playerId: e.playerId,
    username: e.username,
    status: 'READY',
    joinedAt: new Date().toISOString(),
  });

  return {
    matched: true,
    data: {
      lobby: {
        id: matchId,
        status: 'READY',
        stakeAmount,
        minPlayers: 2,
        maxPlayers: 2,
        currentPlayerCount: 2,
        prizePool: stakeAmount * 2,
        players: [toPlayer(player1), toPlayer(player2)],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
      invoiceLink: '',
      invoiceId: '',
    } satisfies JoinLobbyResponse,
  };
}

export async function getQueueStatus(accessToken: string): Promise<MatchmakingQueueStatus> {
  const profile = await getProfile(accessToken);
  const state = queue.getStatus(profile.id);
  return { playerId: profile.id, state, stakeAmount: 0, waitingSeconds: 0 };
}

export async function leaveQueue(accessToken: string): Promise<void> {
  const profile = await getProfile(accessToken);
  queue.dequeue(profile.id);
}

export async function pollUntilMatched(
  accessToken: string,
  intervalMs = 2000,
  maxAttempts = 5,
): Promise<MatchmakingQueueStatus> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const status = await getQueueStatus(accessToken);
    if (status.state !== 'SEARCHING') return status;
  }
  return getQueueStatus(accessToken);
}
