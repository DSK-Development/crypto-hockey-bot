import { Context } from 'telegraf';
import { config } from '../config/env';

export async function startCommand(ctx: Context): Promise<void> {
  await ctx.reply(
    '👋 Welcome to Crypto Hockey!\n\nCompete, earn, and trade — tap Play to jump in.',
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🏒 Play',
              web_app: { url: config.bot.webAppUrl },
            },
          ],
        ],
      },
    },
  );
}
