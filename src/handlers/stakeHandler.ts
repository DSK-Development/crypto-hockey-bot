import { Context } from 'telegraf';
import { CallbackQuery } from 'telegraf/types';
import { parseStakeCallback } from '../keyboards/stakeKeyboard';

type CallbackQueryContext = Context & {
  callbackQuery: CallbackQuery.DataQuery;
};

export async function stakeHandler(ctx: CallbackQueryContext): Promise<void> {
  const amount = parseStakeCallback(ctx.callbackQuery.data);

  if (amount === null) {
    await ctx.answerCbQuery();
    return;
  }

  // A playable Mini App link requires a matchId, which only exists once an
  // opponent is found. So we only offer matchmaking here — the bot sends the
  // "Play" button (with matchId) once the match is created.
  await ctx.editMessageText(`⭐ Stake: ${amount} Stars — ready to find an opponent?`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔍 Find Match', callback_data: `match:find:${amount}` }],
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
