import { Context } from 'telegraf';
import { CallbackQuery } from 'telegraf/types';
import { getSession } from '../session/sessionStore';
import { enterQueue, pollUntilMatched, leaveQueue } from '../services/matchmakingService';
import { JoinLobbyResponse, MatchmakingQueueStatus } from '../types/api';
import { AccountApiError } from '../services/httpClient';

type DataCallbackContext = Context & { callbackQuery: CallbackQuery.DataQuery };

export function parseMatchFindCallback(data: string): number | null {
  const [prefix, raw] = data.split(':');
  if (prefix !== 'match' || raw !== 'find') return null;
  const [, , stakeRaw] = data.split(':');
  const amount = Number(stakeRaw);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function formatLobbyFound(join: JoinLobbyResponse): string {
  const { lobby, invoiceLink } = join;
  const opponent = lobby.players.find((p) => p.status !== 'LEFT');
  const opponentName = opponent?.username ?? 'opponent';
  return (
    `✅ Opponent found: @${opponentName}\n` +
    `⭐ Stake: ${lobby.stakeAmount} Stars | Prize pool: ${lobby.prizePool} Stars\n\n` +
    `Pay your stake to confirm your spot:\n${invoiceLink}`
  );
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
): Promise<void> {
  if (searchMsgId) {
    await ctx.telegram.editMessageText(ctx.chat!.id, searchMsgId, undefined, text).catch(() =>
      ctx.reply(text),
    );
  } else {
    await ctx.reply(text);
  }
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
      await editOrReply(ctx, searchMsgId, formatLobbyFound(data as JoinLobbyResponse));
      return;
    }

    const polled = await pollUntilMatched(accessToken);

    if (polled.state === 'MATCHED' && polled.lobby) {
      const join: JoinLobbyResponse = {
        lobby: polled.lobby,
        invoiceLink: '',
        invoiceId: '',
      };
      await editOrReply(ctx, searchMsgId, formatLobbyFound(join));
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
