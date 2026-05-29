import { httpClient, withAuth, AccountApiError } from './httpClient';
import { JoinLobbyResponse, MatchmakingQueueStatus } from '../types/api';

export type EnterQueueResult =
  | { matched: true; response: JoinLobbyResponse }
  | { matched: false; status: MatchmakingQueueStatus };

export async function enterQueue(
  stakeAmount: number,
  accessToken: string,
): Promise<{ matched: boolean; data: JoinLobbyResponse | MatchmakingQueueStatus }> {
  const response = await httpClient.post(
    '/matchmaking/queue',
    { stakeAmount },
    { ...withAuth(accessToken), validateStatus: (s) => s === 200 || s === 202 },
  );

  return {
    matched: response.status === 200,
    data: response.data as JoinLobbyResponse | MatchmakingQueueStatus,
  };
}

export async function getQueueStatus(accessToken: string): Promise<MatchmakingQueueStatus> {
  const { data } = await httpClient.get<MatchmakingQueueStatus>(
    '/matchmaking/status',
    withAuth(accessToken),
  );
  return data;
}

export async function leaveQueue(accessToken: string): Promise<void> {
  await httpClient.delete('/matchmaking/queue', withAuth(accessToken));
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
