import { NarrowedContext, Context } from 'telegraf';
import { Update, Message } from 'telegraf/types';
import { config } from '../config/env';
import { parseReferralCode, buildWebAppUrl } from '../utils/referral';

type StartContext = NarrowedContext<
  Context,
  Update.MessageUpdate<Message.TextMessage>
> & { startPayload: string };

export async function startCommand(ctx: StartContext): Promise<void> {
  const referralCode = parseReferralCode(ctx.startPayload);
  const webAppUrl = buildWebAppUrl(config.bot.webAppUrl, referralCode);

  await ctx.reply(
    '👋 Welcome to Crypto Hockey!\n\nCompete, earn, and trade — tap Play to jump in.',
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🏒 Play',
              web_app: { url: webAppUrl },
            },
          ],
        ],
      },
    },
  );
}
