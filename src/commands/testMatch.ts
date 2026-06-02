import { Context } from 'telegraf';
import { getSession } from '../session/sessionStore';
import { getProfile } from '../services/accountService';
import { createEngineMatch } from '../services/engineService';
import { buildWebAppUrl } from '../utils/referral';
import { config } from '../config/env';

export async function testMatchCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const accessToken = await getSession(telegramId);
  if (!accessToken) {
    await ctx.reply('⚠️ Open the game first via /start to sign in, then try again.');
    return;
  }

  let profile: Awaited<ReturnType<typeof getProfile>>;
  try {
    profile = await getProfile(accessToken);
  } catch {
    await ctx.reply('❌ Could not fetch your profile. Try again.');
    return;
  }

  const matchId = crypto.randomUUID();
  try {
    await createEngineMatch({
      matchId,
      stakeStars: 0,
      players: [
        { userId: profile.id, telegramId: profile.telegramId, username: profile.username || 'you' },
        { userId: 'test-bot', telegramId: 0, username: 'TestBot' },
      ],
    });
  } catch {
    await ctx.reply('❌ Engine unavailable. Make sure the game engine is running.');
    return;
  }

  const url = buildWebAppUrl(config.bot.webAppUrl, null, matchId);
  await ctx.reply('🧪 Test match created! Tap to open:', {
    reply_markup: {
      inline_keyboard: [[{ text: '🏒 Play (test)', web_app: { url } }]],
    },
  });
}
