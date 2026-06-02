import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { CallbackQuery } from 'telegraf/types';
import { config } from './config/env';
import { startCommand } from './commands/start';
import { playCommand } from './commands/play';
import { stakeHandler, stakeBackHandler } from './handlers/stakeHandler';
import { successfulPaymentHandler } from './handlers/paymentHandler';
import { preCheckoutQueryHandler } from './handlers/preCheckoutQueryHandler';
import { matchFindHandler } from './handlers/matchmakingHandler';
import { testMatchCommand } from './commands/testMatch';
import { authTelegram } from './services/accountService';
import { saveSession, closeRedis } from './session/sessionStore';
import { startHttpServer } from './server';

const bot = new Telegraf(config.bot.token);

bot.start(startCommand);
bot.command('play', playCommand);
bot.command('testmatch', testMatchCommand);
bot.help((ctx) => ctx.reply('Use /start to open the game or /play to pick a stake.'));

bot.on('pre_checkout_query', (ctx) =>
  preCheckoutQueryHandler(ctx as Parameters<typeof preCheckoutQueryHandler>[0]),
);

bot.on(message('web_app_data'), async (ctx) => {
  const initData = ctx.message.web_app_data.data;
  const telegramId = ctx.from.id;
  try {
    const auth = await authTelegram(initData);
    await saveSession(telegramId, auth.accessToken, auth.expiresIn);
  } catch (err) {
    console.error('[auth] web_app_data failed for', telegramId, ':', err);
  }
});

bot.on('successful_payment', (ctx) =>
  successfulPaymentHandler(ctx as Parameters<typeof successfulPaymentHandler>[0]),
);

bot.action(/^match:find:\d+$/, (ctx) =>
  matchFindHandler(ctx as Parameters<typeof matchFindHandler>[0]),
);

bot.action('stake:back', (ctx) =>
  stakeBackHandler(ctx as Parameters<typeof stakeBackHandler>[0]),
);

bot.action(/^stake:\d+$/, (ctx) => {
  const cq = ctx.callbackQuery as CallbackQuery.DataQuery;
  if (!cq?.data) return ctx.answerCbQuery();
  return stakeHandler(ctx as Parameters<typeof stakeHandler>[0]);
});

const httpServer = startHttpServer(bot);

// Clear any existing webhook so polling works cleanly
bot.telegram.deleteWebhook().then(() =>
  bot.launch({ dropPendingUpdates: true })
).then(() => {
  console.log('Bot started [polling]');
}).catch((err) => {
  console.error('startup error:', err);
  process.exit(1);
});

process.once('SIGINT', () => { void closeRedis(); httpServer.close(); bot.stop('SIGINT'); });
process.once('SIGTERM', () => { void closeRedis(); httpServer.close(); bot.stop('SIGTERM'); });
