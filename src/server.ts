import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import { Telegraf } from 'telegraf';
import { config } from './config/env';
import { createMatchmakingRouter } from './routes/matchmaking';
import { createMatchResultRouter } from './routes/matchResult';
import { createAuthRouter } from './routes/auth';

function webAppCors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  const allowed = new URL(config.bot.webAppUrl).origin;
  if (origin === allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
}

export function startHttpServer(bot: Telegraf): http.Server {
  const app = express();
  app.use(express.json());
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
