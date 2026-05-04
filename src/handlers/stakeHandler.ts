import { Context } from 'telegraf';
import { CallbackQuery } from 'telegraf/types';
import { parseStakeCallback } from '../keyboards/stakeKeyboard';
import { buildWebAppUrl } from '../utils/referral';
import { config } from '../config/env';

type CallbackQueryContext = Context & {
  callbackQuery: CallbackQuery.DataQuery;
};

export async function stakeHandler(ctx: CallbackQueryContext): Promise<void> {
  const amount = parseStakeCallback(ctx.callbackQuery.data);

  if (amount === null) {
    await ctx.answerCbQuery();
    return;
  }

  const url = new URL(buildWebAppUrl(config.bot.webAppUrl, null));
  url.searchParams.set('stake', String(amount));

  await ctx.editMessageText(`⭐ Stake: ${amount} Stars — tap Play to enter the match.`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🏒 Play', web_app: { url: url.toString() } }],
        [{ text: '← Change stake', callback_data: 'stake:back' }],
      ],
    },
  });

  await ctx.answerCbQuery();
}

export async function stakeBackHandler(ctx: CallbackQueryContext): Promise<void> {
  const { stakeKeyboard } = await import('../keyboards/stakeKeyboard');

  await ctx.editMessageText('🏒 Choose your stake to enter a match:', {
    reply_markup: stakeKeyboard(),
  });

  await ctx.answerCbQuery();
}
