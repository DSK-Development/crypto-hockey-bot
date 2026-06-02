import { Router, Request, Response } from 'express';
import { Telegraf } from 'telegraf';
import { config } from '../config/env';
import { registry } from '../queue/MatchRegistry';

interface ResultBody {
  matchId: string;
  participants: Array<{ userId: string; placement: number }>;
  stakeStars: number;
  reason: string;
}

export function createMatchResultRouter(bot: Telegraf): Router {
  const router = Router();

  router.post('/:id/result', async (req: Request, res: Response): Promise<void> => {
    if (req.headers['x-service-token'] !== config.bot.serviceToken) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const matchId = req.params.id as string;
    const match = registry.get(matchId);
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const body = req.body as ResultBody;
    const winnerUserId = body.participants.find((p) => p.placement === 1)?.userId;

    const messageFor = (playerId: string): string =>
      playerId === winnerUserId
        ? `🏆 You won the match! ⭐ +${body.stakeStars * 2} Stars awarded.`
        : `💔 You lost the match. Better luck next time!`;

    registry.delete(matchId);

    await Promise.allSettled([
      bot.telegram.sendMessage(match.player1.telegramId, messageFor(match.player1.playerId)),
      bot.telegram.sendMessage(match.player2.telegramId, messageFor(match.player2.playerId)),
    ]);

    res.status(200).json({ ok: true });
  });

  return router;
}
