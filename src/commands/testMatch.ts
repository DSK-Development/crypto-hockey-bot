import { Context } from 'telegraf';
import { createEngineMatch } from '../services/engineService';
import { buildWebAppUrl } from '../utils/referral';
import { config } from '../config/env';

export async function testMatchCommand(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const matchId = crypto.randomUUID();
  try {
    await createEngineMatch({
      matchId,
      stakeStars: 0,
      players: [
        { userId: String(from.id), telegramId: from.id, username: from.username || `user_${from.id}` },
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
