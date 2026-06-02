import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/accountService', () => ({ holdStake: vi.fn() }));
vi.mock('../config/env', () => ({
  config: {
    accountManagement: { serviceToken: 'svc-token' },
    bot: { webAppUrl: 'https://app.example.com' },
  },
}));

import { preCheckoutQueryHandler } from './preCheckoutQueryHandler';

function makeCtx(invoicePayload: string, totalAmount: number) {
  return {
    preCheckoutQuery: { invoice_payload: invoicePayload, total_amount: totalAmount },
    answerPreCheckoutQuery: vi.fn().mockResolvedValue(undefined),
  } as any;
}

describe('preCheckoutQueryHandler', () => {
  it('approves when amount matches payload stakeAmount', async () => {
    const ctx = makeCtx('{"lobbyId":"l1","playerId":"p1","stakeAmount":50}', 50);

    await preCheckoutQueryHandler(ctx);

    expect(ctx.answerPreCheckoutQuery).toHaveBeenCalledWith(true);
  });

  it('rejects when total_amount does not match stakeAmount', async () => {
    const ctx = makeCtx('{"lobbyId":"l1","playerId":"p1","stakeAmount":50}', 100);

    await preCheckoutQueryHandler(ctx);

    expect(ctx.answerPreCheckoutQuery).toHaveBeenCalledWith(false, expect.any(String));
  });

  it('rejects on malformed payload JSON', async () => {
    const ctx = makeCtx('not-json', 50);

    await preCheckoutQueryHandler(ctx);

    expect(ctx.answerPreCheckoutQuery).toHaveBeenCalledWith(false, expect.any(String));
  });
});
