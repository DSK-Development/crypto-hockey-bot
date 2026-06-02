import { Router, Request, Response, NextFunction } from 'express';
import { Telegraf } from 'telegraf';
import { getProfile } from '../services/accountService';
import { enterQueue, getQueueStatus, leaveQueue, AlreadyInQueueError } from '../services/matchmakingService';
import { createEngineMatch, EnginePlayer } from '../services/engineService';
import { buildWebAppUrl } from '../utils/referral';
import { config } from '../config/env';
import { JoinLobbyResponse } from '../types/api';
import { registry } from '../queue/MatchRegistry';

async function playerAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = header.slice(7);
  try {
    await getProfile(token);
    (req as any).accessToken = token;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

export function createMatchmakingRouter(bot: Telegraf): Router {
  const router = Router();

  router.post('/queue', playerAuth, async (req: Request, res: Response): Promise<void> => {
    const accessToken = (req as any).accessToken as string;
    const stakeAmount = Number(req.body?.stakeAmount);
    if (!Number.isFinite(stakeAmount) || stakeAmount <= 0) {
      res.status(400).json({ error: 'Invalid stakeAmount' });
      return;
    }

    let result: Awaited<ReturnType<typeof enterQueue>>;
    try {
      result = await enterQueue(stakeAmount, accessToken);
    } catch (err) {
      if (err instanceof AlreadyInQueueError) {
        res.status(409).json({ error: 'Already in queue' });
        return;
      }
      res.status(500).json({ error: 'Internal error' });
      return;
    }

    if (!result.matched) {
      res.status(202).json(result.data);
      return;
    }

    const join = result.data as JoinLobbyResponse;
    const { lobby } = join;
    const matchRecord = registry.get(lobby.id);
    if (!matchRecord) {
      res.status(503).json({ error: 'Match state unavailable' });
      return;
    }

    const players: [EnginePlayer, EnginePlayer] = [
      {
        userId: lobby.players[0]!.playerId,
        telegramId: matchRecord.player1.telegramId,
        username: lobby.players[0]!.username,
      },
      {
        userId: lobby.players[1]!.playerId,
        telegramId: matchRecord.player2.telegramId,
        username: lobby.players[1]!.username,
      },
    ];

    try {
      await createEngineMatch({ matchId: lobby.id, stakeStars: stakeAmount, players });
    } catch {
      res.status(503).json({ error: 'Engine unavailable' });
      return;
    }

    const webAppUrl = buildWebAppUrl(config.bot.webAppUrl, null, lobby.id);
    const text =
      `✅ Match found! ⭐ Stake: ${stakeAmount} Stars | Prize: ${lobby.prizePool} Stars\n\nTap Play to enter the rink.`;
    const markup = {
      reply_markup: { inline_keyboard: [[{ text: '🏒 Play', web_app: { url: webAppUrl } }]] },
    };

    await Promise.allSettled([
      bot.telegram.sendMessage(matchRecord.player1.telegramId, text, markup),
      bot.telegram.sendMessage(matchRecord.player2.telegramId, text, markup),
    ]);

    res.status(200).json(join);
  });

  router.get('/status', playerAuth, async (req: Request, res: Response): Promise<void> => {
    const accessToken = (req as any).accessToken as string;
    try {
      const status = await getQueueStatus(accessToken);
      res.status(200).json(status);
    } catch {
      res.status(500).json({ error: 'Internal error' });
    }
  });

  router.delete('/queue', playerAuth, async (req: Request, res: Response): Promise<void> => {
    const accessToken = (req as any).accessToken as string;
    try {
      await leaveQueue(accessToken);
      res.status(204).send();
    } catch {
      res.status(500).json({ error: 'Internal error' });
    }
  });

  return router;
}
