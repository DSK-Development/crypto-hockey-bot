import { Telegraf } from 'telegraf';
import { config } from './config/env';
import { startCommand } from './commands/start';

const bot = new Telegraf(config.bot.token);

bot.start(startCommand);

bot.help((ctx) => {
  ctx.reply('Use /start to open the game.');
});

bot.launch().then(() => {
  console.log(`Bot started [${config.nodeEnv}]`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
