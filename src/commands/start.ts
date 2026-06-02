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

  // The web_app button MUST live in a reply keyboard (not inline): Telegram
  // only delivers `web_app_data` (used here to sign the user in) for Mini Apps
  // launched from reply-keyboard buttons.
  await ctx.reply(
    '👋 Welcome to Crypto Hockey!\n\n' +
      '1️⃣ Tap "🏒 Open & sign in" below to sign in.\n' +
      '2️⃣ Use /play to find a match, or /testmatch to try a solo match.',
    {
      reply_markup: {
        keyboard: [[{ text: '🏒 Open & sign in', web_app: { url: webAppUrl } }]],
        resize_keyboard: true,
        is_persistent: true,
      },
    },
  );
}
