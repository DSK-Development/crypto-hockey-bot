import http from 'http';
import express from 'express';
import { Telegraf } from 'telegraf';
import { config } from './config/env';
import { createMatchmakingRouter } from './routes/matchmaking';
import { createMatchResultRouter } from './routes/matchResult';

export function startHttpServer(bot: Telegraf): http.Server {
  const app = express();
  app.use(express.json());
  app.post('/telegram', (req, res) => {
    console.log('[webhook] update received');
    bot.handleUpdate(req.body, res).catch((err) => {
      console.error('[webhook] handleUpdate error:', err);
      res.sendStatus(500);
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
