import { Telegraf } from 'telegraf';
import { config } from './config/env';

const bot = new Telegraf(config.bot.token);

bot.start((ctx) => {
  ctx.reply('Welcome to Crypto Hockey! 🏒');
});

bot.help((ctx) => {
  ctx.reply('Use /start to begin.');
});

bot.launch().then(() => {
  console.log(`Bot started [${config.nodeEnv}]`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
