export interface TelegramAuthRequest {
  initData: string;
  referralCode?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  player: PlayerProfile;
}

export type PlayerStatus = 'ONLINE' | 'IN_LOBBY' | 'IN_GAME' | 'OFFLINE';

export interface PlayerProfile {
  id: string;
  telegramId: number;
  username: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  level: number;
  xp: number;
  rating: number;
  status: PlayerStatus;
  isBanned: boolean;
  createdAt: string;
  lastActiveAt: string;
}

export interface WalletBalance {
  playerId: string;
  availableStars: number;
  heldStars: number;
  totalStars: number;
}

export interface ApiError {
  code: string;
  message: string;
  timestamp: string;
  traceId?: string;
}
