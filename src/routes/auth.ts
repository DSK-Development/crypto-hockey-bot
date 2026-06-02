import { Router, Request, Response } from 'express';
import { authTelegram } from '../services/accountService';
import { saveSession } from '../session/sessionStore';

export function createAuthRouter(): Router {
  const router = Router();

  router.post('/session', async (req: Request, res: Response): Promise<void> => {
    const initData = req.body?.initData;
    if (typeof initData !== 'string' || !initData.trim()) {
      res.status(400).json({ error: 'initData required' });
      return;
    }

    try {
      const auth = await authTelegram(initData);
      await saveSession(auth.player.telegramId, auth.accessToken, auth.expiresIn);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[auth] /auth/session failed:', err);
      res.status(401).json({ error: 'Invalid initData' });
    }
  });

  return router;
}
