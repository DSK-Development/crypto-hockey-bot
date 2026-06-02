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

export interface LobbyPlayer {
  playerId: string;
  username: string;
  photoUrl?: string;
  status: 'WAITING_PAYMENT' | 'READY' | 'LEFT';
  joinedAt: string;
}

export type LobbyStatus = 'WAITING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

export interface Lobby {
  id: string;
  status: LobbyStatus;
  stakeAmount: number;
  minPlayers: number;
  maxPlayers: number;
  currentPlayerCount: number;
  prizePool: number;
  players: LobbyPlayer[];
  matchId?: string;
  createdBy?: string;
  createdAt: string;
  expiresAt: string;
}

export interface JoinLobbyResponse {
  lobby: Lobby;
  invoiceLink: string;
  invoiceId: string;
}

export type MatchmakingState = 'SEARCHING' | 'MATCHED' | 'TIMED_OUT' | 'NOT_IN_QUEUE';

export interface MatchmakingQueueStatus {
  playerId: string;
  state: MatchmakingState;
  stakeAmount: number;
  waitingSeconds: number;
  lobby?: Lobby;
}

export interface Transaction {
  id: string;
  playerId: string;
  type: string;
  amount: number;
  status: string;
}

export interface HoldStakeRequest {
  playerId: string;
  matchId: string;
  amount: number;
  telegramPaymentChargeId: string;
}

export interface InvoicePayload {
  lobbyId: string;
  playerId: string;
  stakeAmount: number;
}

export interface PlayerBasicInfo {
  id: string;
  telegramId: number;
  username: string;
}

export interface ApiError {
  code: string;
  message: string;
  timestamp: string;
  traceId?: string;
}
