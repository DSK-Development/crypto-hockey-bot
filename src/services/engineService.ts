import axios from 'axios';
import { config } from '../config/env';

export interface EnginePlayer {
  userId: string;
  telegramId: number;
  username: string;
}

export interface CreateMatchRequest {
  matchId: string;
  stakeStars: number;
  players: [EnginePlayer, EnginePlayer];
}

const client = axios.create({
  baseURL: config.engine.baseUrl,
  timeout: 3000,
  headers: { 'X-Service-Token': config.engine.serviceToken },
});

export async function createEngineMatch(req: CreateMatchRequest): Promise<void> {
  await client.post('/internal/matches', req);
}
