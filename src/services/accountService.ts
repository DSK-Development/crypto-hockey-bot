import { httpClient, withAuth } from './httpClient';
import {
  TelegramAuthRequest,
  AuthResponse,
  PlayerProfile,
  PlayerBasicInfo,
  WalletBalance,
  HoldStakeRequest,
  Transaction,
} from '../types/api';

export async function authTelegram(initData: string, referralCode?: string): Promise<AuthResponse> {
  const body: TelegramAuthRequest = { initData };
  if (referralCode) body.referralCode = referralCode;

  const { data } = await httpClient.post<AuthResponse>('/auth/telegram', body);
  return data;
}

export async function getProfile(accessToken: string): Promise<PlayerProfile> {
  const { data } = await httpClient.get<PlayerProfile>('/users/me', withAuth(accessToken));
  return data;
}

export async function getBalance(accessToken: string): Promise<WalletBalance> {
  const { data } = await httpClient.get<WalletBalance>('/wallet/balance', withAuth(accessToken));
  return data;
}

export async function getPlayerById(playerId: string, serviceToken: string): Promise<PlayerBasicInfo> {
  const { data } = await httpClient.get<PlayerBasicInfo>(`/internal/users/${playerId}`, withAuth(serviceToken));
  return data;
}

export async function holdStake(body: HoldStakeRequest, serviceToken: string): Promise<Transaction> {
  const { data } = await httpClient.post<Transaction>('/wallet/hold', body, withAuth(serviceToken));
  return data;
}
