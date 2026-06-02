import { Context } from 'telegraf';
import { createEngineMatch } from '../services/engineService';
import { getProfile } from '../services/accountService';
import { getSession } from '../session/sessionStore';
import { buildWebAppUrl } from '../utils/referral';
import { config } from '../config/env';

export async function testMatchCommand(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const accessToken = await getSession(from.id);
  if (!accessToken) {
    await ctx.reply('⚠️ Sign in first: /start → Open & sign in, then run /testmatch again.');
    return;
  }

  let profile: Awaited<ReturnType<typeof getProfile>>;
  try {
    profile = await getProfile(accessToken);
  } catch {
    await ctx.reply('⚠️ Session expired. Use /start to sign in again.');
    return;
  }

  const matchId = crypto.randomUUID();
  try {
    await createEngineMatch({
      matchId,
      stakeStars: 0,
      players: [
        {
          userId: profile.id,
          telegramId: profile.telegramId,
          username: profile.username || `user_${from.id}`,
        },
        {
          userId: '00000000-0000-0000-0000-000000000099',
          telegramId: 0,
          username: 'TestBot',
        },
      ],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await ctx.reply(`❌ Engine error: ${msg}`);
    return;
  }

  const url = buildWebAppUrl(config.bot.webAppUrl, null, matchId);
  await ctx.reply('🧪 Test match created! Tap to open:', {
    reply_markup: {
      inline_keyboard: [[{ text: '🏒 Play (test)', web_app: { url } }]],
    },
  });
}
