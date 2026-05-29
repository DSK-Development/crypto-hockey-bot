import { Context } from 'telegraf';
import { PreCheckoutQuery } from 'telegraf/types';
import { parseInvoicePayload } from './paymentHandler';

type PreCheckoutContext = Context & { preCheckoutQuery: PreCheckoutQuery };

export async function preCheckoutQueryHandler(ctx: PreCheckoutContext): Promise<void> {
  const query = ctx.preCheckoutQuery;
  try {
    const payload = parseInvoicePayload(query.invoice_payload);
    if (query.total_amount !== payload.stakeAmount) {
      await ctx.answerPreCheckoutQuery(false, 'Payment amount does not match. Please try again.');
      return;
    }
    await ctx.answerPreCheckoutQuery(true);
  } catch (err) {
    console.error('[pre_checkout] invalid payload:', err);
    await ctx.answerPreCheckoutQuery(false, 'Invalid payment data. Please try again.');
  }
}
