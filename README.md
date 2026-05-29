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
├── index.ts                         # bot entrypoint, command/event wiring
├── config/env.ts                    # validated env loader
├── commands/
│   ├── start.ts                     # /start with Play WebApp button + referral
│   └── play.ts                      # /play stake selection
├── handlers/
│   ├── stakeHandler.ts              # callback after stake amount tapped
│   ├── matchmakingHandler.ts        # "searching..." + queue polling
│   ├── paymentHandler.ts            # successful_payment → hold stake (idempotent)
│   └── preCheckoutQueryHandler.ts   # pre_checkout_query → answerPreCheckoutQuery
├── keyboards/
│   └── stakeKeyboard.ts             # 10/50/100 Stars inline keyboard
├── services/
│   ├── httpClient.ts                # axios instance + AccountApiError
│   ├── accountService.ts            # authTelegram, getProfile, getBalance, holdStake
│   └── matchmakingService.ts        # enterQueue, getQueueStatus, leaveQueue, polling
├── session/
│   └── sessionStore.ts              # in-memory JWT store keyed by telegramId
├── types/
│   └── api.ts                       # TS types matching account-service swagger
└── utils/
    └── referral.ts                  # parse ref_xxx, append to WebApp URL
```

## Features

| Feature | Description |
|---|---|
| `/start` | Welcome + Play WebApp button. Parses `ref_<code>` payload and propagates it to the WebApp URL. |
| `/play` | Inline keyboard with stake options: ⭐ 10, 50, 100 Stars. |
| Stake confirmation | After picking a stake, offers `🔍 Find Match` (matchmaking via bot) or `🏒 Play (WebApp)`. |
| Matchmaking | Sends "Searching...", polls `/matchmaking/queue` & `/matchmaking/status`, edits message in place with the result. |
| Pre-checkout | Answers every Telegram `pre_checkout_query` within the required 10 s window — validates `total_amount` matches `invoice_payload.stakeAmount`. Without this, all Stars payments fail. |
| Payments | Handles Telegram `successful_payment` event — extracts `total_amount` + `telegram_payment_charge_id`, parses `invoice_payload` (`{lobbyId, playerId, stakeAmount}`), calls `POST /wallet/hold` on account-management. Idempotent: duplicate deliveries are dropped by a module-level processed-charge Set. |
| Session population | Handles `web_app_data` from the Mini App — authenticates `initData` with account-management and saves the JWT in the in-memory session store so subsequent matchmaking calls have a valid token. |

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

## Docker

Build the bot image alone:

```bash
docker build -t crypto-hockey-bot .
docker run \
  -e BOT_TOKEN=<your-bot-token> \
  -e WEBAPP_URL=https://your-frontend.com \
  -e ACCOUNT_MANAGEMENT_URL=http://account-management:8080 \
  -e SERVICE_TOKEN=change-me \
  -e ENGINE_BASE_URL=http://game-engine:8081 \
  -e ENGINE_SERVICE_TOKEN=change-me \
  crypto-hockey-bot
```

### Full-stack with docker-compose

`docker-compose.yml` in this repo orchestrates all five services: **postgres**, **account-management**, **game-engine**, **bot**, **frontend**.

```bash
cp .env.example .env   # fill in BOT_TOKEN, JWT_SECRET, SERVICE_TOKEN, ENGINE_SERVICE_TOKEN, WEBAPP_URL, VITE_ENGINE_WS_URL
docker compose up --build
```

The compose file builds sibling repos via relative paths (`../crypto-hockey-account-management`, etc.), so all four repos must be checked out under the same parent directory.

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
