import { Context } from 'telegraf';
import { CallbackQuery, InlineKeyboardMarkup } from 'telegraf/types';
import { getSession } from '../session/sessionStore';
import { enterQueue, pollUntilMatched, leaveQueue } from '../services/matchmakingService';
import { JoinLobbyResponse, MatchmakingQueueStatus } from '../types/api';
import { AccountApiError } from '../services/httpClient';
import { createEngineMatch, EnginePlayer } from '../services/engineService';
import { buildWebAppUrl } from '../utils/referral';
import { config } from '../config/env';

type DataCallbackContext = Context & { callbackQuery: CallbackQuery.DataQuery };

export function parseMatchFindCallback(data: string): number | null {
  const [prefix, raw] = data.split(':');
  if (prefix !== 'match' || raw !== 'find') return null;
  const [, , stakeRaw] = data.split(':');
  const amount = Number(stakeRaw);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

async function sendSearching(ctx: DataCallbackContext): Promise<number | undefined> {
  await ctx.answerCbQuery('🔍 Searching...');
  const sent = await ctx.reply('🔍 Searching for an opponent...');
  return sent.message_id;
}

async function editOrReply(
  ctx: DataCallbackContext,
  searchMsgId: number | undefined,
  text: string,
  replyMarkup?: InlineKeyboardMarkup,
): Promise<void> {
  const opts = replyMarkup ? { reply_markup: replyMarkup } : undefined;
  if (searchMsgId && ctx.chat) {
    await ctx.telegram
      .editMessageText(ctx.chat.id, searchMsgId, undefined, text, opts)
      .catch(() => ctx.reply(text, opts));
  } else {
    await ctx.reply(text, opts);
  }
}

async function presentMatchFound(
  ctx: DataCallbackContext,
  searchMsgId: number | undefined,
  join: JoinLobbyResponse,
): Promise<void> {
  const { lobby } = join;
  // LobbyPlayer has playerId + username; telegramId is not exposed by the lobby DTO.
  // TODO: enrich with telegramId by calling accountService.getProfile if needed.
  const activePlayers = lobby.players.filter((p) => p.status !== 'LEFT').slice(0, 2);
  if (activePlayers.length !== 2) {
    await editOrReply(ctx, searchMsgId, '⚠️ Could not start match — please /play again.');
    return;
  }

  const players = activePlayers.map((p): EnginePlayer => ({
    userId: p.playerId,
    telegramId: 0, // TODO: fetch real telegramId from account-management profile
    username: p.username ?? `player_${p.playerId.slice(0, 6)}`,
  })) as [EnginePlayer, EnginePlayer];

  try {
    await createEngineMatch({
      matchId: lobby.id,
      stakeStars: lobby.stakeAmount,
      players,
    });
  } catch {
    await editOrReply(ctx, searchMsgId, '⚠️ Engine unavailable. Please try again.');
    return;
  }

  const webAppUrl = buildWebAppUrl(config.bot.webAppUrl, null, lobby.id);
  const text =
    `✅ Opponent found: @${players[1]!.username}\n` +
    `⭐ Stake: ${lobby.stakeAmount} Stars | Prize pool: ${lobby.prizePool} Stars\n\n` +
    `Tap Play to enter the rink.`;

  await editOrReply(ctx, searchMsgId, text, {
    inline_keyboard: [[{ text: '🏒 Play', web_app: { url: webAppUrl } }]] as InlineKeyboardMarkup['inline_keyboard'],
  } as InlineKeyboardMarkup);
}

export async function matchFindHandler(ctx: DataCallbackContext): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) { await ctx.answerCbQuery(); return; }

  const stakeAmount = parseMatchFindCallback(ctx.callbackQuery.data);
  if (stakeAmount === null) { await ctx.answerCbQuery(); return; }

  const accessToken = getSession(telegramId);
  if (!accessToken) {
    await ctx.answerCbQuery();
    await ctx.reply('⚠️ Please open the game first to sign in, then try again.');
    return;
  }

  const searchMsgId = await sendSearching(ctx);

  try {
    const { matched, data } = await enterQueue(stakeAmount, accessToken);

    if (matched) {
      await presentMatchFound(ctx, searchMsgId, data as JoinLobbyResponse);
      return;
    }

    const polled = await pollUntilMatched(accessToken);

    if (polled.state === 'MATCHED' && polled.lobby) {
      const join: JoinLobbyResponse = {
        lobby: polled.lobby,
        invoiceLink: '',
        invoiceId: '',
      };
      await presentMatchFound(ctx, searchMsgId, join);
      return;
    }

    if (polled.state === 'TIMED_OUT') {
      await leaveQueue(accessToken).catch(() => {});
      await editOrReply(ctx, searchMsgId, '⏱ No opponent found. Try again in a moment.');
      return;
    }

    await editOrReply(ctx, searchMsgId, '⏳ Still searching... Check back shortly.');
  } catch (err) {
    const text =
      err instanceof AccountApiError && err.status === 409
        ? '⚠️ You are already in a lobby or queue.'
        : '❌ Matchmaking failed. Please try again.';

    await editOrReply(ctx, searchMsgId, text);
  }
}
