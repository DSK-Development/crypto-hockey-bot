import { Telegraf } from 'telegraf';
import { CallbackQuery } from 'telegraf/types';
import { config } from './config/env';
import { startCommand } from './commands/start';
import { playCommand } from './commands/play';
import { stakeHandler, stakeBackHandler } from './handlers/stakeHandler';

const bot = new Telegraf(config.bot.token);

bot.start(startCommand);
bot.command('play', playCommand);
bot.help((ctx) => ctx.reply('Use /start to open the game or /play to pick a stake.'));

bot.action('stake:back', (ctx) =>
  stakeBackHandler(ctx as Parameters<typeof stakeBackHandler>[0]),
);

bot.action(/^stake:\d+$/, (ctx) => {
  const cq = ctx.callbackQuery as CallbackQuery.DataQuery;
  if (!cq?.data) return ctx.answerCbQuery();
  return stakeHandler(ctx as Parameters<typeof stakeHandler>[0]);
});

bot.launch().then(() => {
  console.log(`Bot started [${config.nodeEnv}]`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
