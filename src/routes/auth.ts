import { Router, Request, Response } from 'express';
import { authTelegram } from '../services/accountService';
import { AccountApiError } from '../services/httpClient';
import { saveSession, SessionStoreError } from '../session/sessionStore';

export function createAuthRouter(): Router {
  const router = Router();

  router.post('/session', async (req: Request, res: Response): Promise<void> => {
    const initData = req.body?.initData;
    if (typeof initData !== 'string' || !initData.trim()) {
      res.status(400).json({ error: 'INIT_DATA_REQUIRED', message: 'initData required' });
      return;
    }

    try {
      const auth = await authTelegram(initData);
      await saveSession(auth.player.telegramId, auth.accessToken, auth.expiresIn);
      res.status(200).json({ ok: true });
    } catch (err) {
      if (err instanceof AccountApiError) {
        console.error('[auth] /auth/session account error:', err.status, err.code, err.message);
        res.status(err.status === 401 ? 401 : 502).json({
          error: err.code,
          message: err.message,
        });
        return;
      }
      if (err instanceof SessionStoreError) {
        console.error('[auth] /auth/session redis error:', err.message);
        res.status(503).json({
          error: 'SESSION_STORE_UNAVAILABLE',
          message: 'Could not save session. Check REDIS_URL on the bot service.',
        });
        return;
      }
      console.error('[auth] /auth/session failed:', err);
      res.status(500).json({ error: 'INTERNAL', message: 'Sign-in failed' });
    }
  });

  return router;
}
