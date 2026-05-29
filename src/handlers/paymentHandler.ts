import { Context } from 'telegraf';
import { Message } from 'telegraf/types';
import { holdStake } from '../services/accountService';
import { config } from '../config/env';
import { InvoicePayload } from '../types/api';

type SuccessfulPaymentContext = Context & {
  message: Message.SuccessfulPaymentMessage;
};

export function parseInvoicePayload(raw: string): InvoicePayload {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'lobbyId' in parsed &&
      'playerId' in parsed &&
      'stakeAmount' in parsed
    ) {
      return parsed as InvoicePayload;
    }
    throw new Error('Missing required fields in invoice payload');
  } catch {
    throw new Error(`Invalid invoice payload: ${raw}`);
  }
}

export async function successfulPaymentHandler(ctx: SuccessfulPaymentContext): Promise<void> {
  const payment = ctx.message.successful_payment;
  const telegramPaymentChargeId = payment.telegram_payment_charge_id;
  const amount = payment.total_amount;

  let payload: InvoicePayload;
  try {
    payload = parseInvoicePayload(payment.invoice_payload);
  } catch (err) {
    console.error('[payment] Failed to parse invoice_payload:', err);
    await ctx.reply('Payment received but failed to process. Please contact support.');
    return;
  }

  try {
    await holdStake(
      {
        playerId: payload.playerId,
        matchId: payload.lobbyId,
        amount,
        telegramPaymentChargeId,
      },
      config.accountManagement.serviceToken,
    );
  } catch (err) {
    console.error('[payment] holdStake failed:', err);
    await ctx.reply('Payment received but stake reservation failed. Please contact support.');
    return;
  }

  await ctx.reply(
    `✅ Payment confirmed!\n\n⭐ ${amount} Stars reserved for your match.\nGet ready to play! 🏒`,
  );
}
