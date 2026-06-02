import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import { Telegraf } from 'telegraf';
import { config } from './config/env';
import { createMatchmakingRouter } from './routes/matchmaking';
import { createMatchResultRouter } from './routes/matchResult';
import { createAuthRouter } from './routes/auth';

// Mini App runs on a different origin than the bot API. initData in the body is
// already signed by Telegram, so we allow any origin for /auth (no cookies).
function webAppCors(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
}

export function startHttpServer(bot: Telegraf): http.Server {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.use('/auth', webAppCors, createAuthRouter());
  app.post('/telegram', (req, res) => {
    res.sendStatus(200);
    bot.handleUpdate(req.body).catch((err) => {
      console.error('[webhook] handleUpdate error:', err);
    });
  });
  app.use('/matchmaking', createMatchmakingRouter(bot));
  app.use('/matches', createMatchResultRouter(bot));

  const port = Number(config.bot.httpPort);
  const server = app.listen(port, () => {
    console.log(`HTTP server listening on port ${port}`);
  });
  return server;
}
