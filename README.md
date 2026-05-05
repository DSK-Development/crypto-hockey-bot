# crypto-hockey-bot

Telegram bot service for **Crypto Hockey** — a Telegram Mini App where players stake Telegram Stars on competitive hockey matches.

This service is the player-facing edge: it handles the Telegram bot interface, lobby orchestration, payment initiation via Telegram Stars, and notifications. Business logic (wallets, transactions, stats) lives in the companion `crypto-hockey-account-management` service.

## Tech stack

- **Node.js** + **TypeScript**
- **Telegraf** (Telegram Bot API)
- **axios** (HTTP client for account-management service)
- **dotenv** (config)

## Project structure

```
src/
├── index.ts                    # bot entrypoint, command/event wiring
├── config/env.ts               # validated env loader
├── commands/
│   ├── start.ts                # /start with Play WebApp button + referral
│   └── play.ts                 # /play stake selection
├── handlers/
│   ├── stakeHandler.ts         # callback after stake amount tapped
│   ├── matchmakingHandler.ts   # "searching..." + queue polling
│   └── paymentHandler.ts       # successful_payment → hold stake
├── keyboards/
│   └── stakeKeyboard.ts        # 10/50/100 Stars inline keyboard
├── services/
│   ├── httpClient.ts           # axios instance + AccountApiError
│   ├── accountService.ts       # authTelegram, getProfile, getBalance, holdStake
│   └── matchmakingService.ts   # enterQueue, getQueueStatus, leaveQueue, polling
├── session/
│   └── sessionStore.ts         # in-memory JWT store keyed by telegramId
├── types/
│   └── api.ts                  # TS types matching account-service swagger
└── utils/
    └── referral.ts             # parse ref_xxx, append to WebApp URL
```

## Features

| Feature | Description |
|---|---|
| `/start` | Welcome + Play WebApp button. Parses `ref_<code>` payload and propagates it to the WebApp URL. |
| `/play` | Inline keyboard with stake options: ⭐ 10, 50, 100 Stars. |
| Stake confirmation | After picking a stake, offers `🔍 Find Match` (matchmaking via bot) or `🏒 Play (WebApp)`. |
| Matchmaking | Sends "Searching...", polls `/matchmaking/queue` & `/matchmaking/status`, edits message in place with the result. |
| Payments | Handles Telegram `successful_payment` event — extracts `total_amount` + `telegram_payment_charge_id`, parses `invoice_payload` (`{lobbyId, playerId, stakeAmount}`), calls `POST /wallet/hold` on account-management. |

## Configuration

Copy `.env.example` to `.env` and fill in:

| Var | Purpose |
|---|---|
| `BOT_TOKEN` | Telegram bot token from @BotFather |
| `WEBAPP_URL` | URL of the Mini App that the Play button opens |
| `ACCOUNT_MANAGEMENT_URL` | Base URL of the account-management service |
| `SERVICE_TOKEN` | Service-to-service JWT used for `/wallet/hold` calls |
| `NODE_ENV` | `development` \| `production` |

## Running

```bash
npm install
npm run dev          # ts-node, hot path
npm run build        # tsc → dist/
npm start            # node dist/index.js
```

## Architecture boundaries

**This service does NOT handle:**

- Wallet balances, transactions, holds, prize transfers
- HMAC validation of Telegram WebApp `initData` (account-management does this)
- Match result recording, player stats
- JWT issuance

**This service DOES handle:**

- Telegram bot updates and commands
- Stake selection UI
- Matchmaking flow (queue + polling)
- Payment event reception and forwarding
- Notification messages to players

All business logic crosses the service boundary via the typed clients in `src/services/`.

## API client mapping

| Function | Method | Endpoint | Service |
|---|---|---|---|
| `authTelegram(initData, ref?)` | `POST` | `/auth/telegram` | account-management |
| `getProfile(token)` | `GET` | `/users/me` | account-management |
| `getBalance(token)` | `GET` | `/wallet/balance` | account-management |
| `holdStake(req, svcToken)` | `POST` | `/wallet/hold` | account-management |
| `enterQueue(stake, token)` | `POST` | `/matchmaking/queue` | bot service |
| `getQueueStatus(token)` | `GET` | `/matchmaking/status` | bot service |
| `leaveQueue(token)` | `DELETE` | `/matchmaking/queue` | bot service |

OpenAPI spec lives at `telegram-bot-swagger.yaml`.
