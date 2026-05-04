import { Context } from 'telegraf';
import { stakeKeyboard } from '../keyboards/stakeKeyboard';

export async function playCommand(ctx: Context): Promise<void> {
  await ctx.reply('🏒 Choose your stake to enter a match:', {
    reply_markup: stakeKeyboard(),
  });
}
