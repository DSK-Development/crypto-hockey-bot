import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/accountService', () => ({
  holdStake: vi.fn(),
}));

vi.mock('../config/env', () => ({
  config: {
    accountManagement: { serviceToken: 'svc-token' },
    bot: { webAppUrl: 'https://app.example.com' },
  },
}));

import { holdStake } from '../services/accountService';
import { parseInvoicePayload, successfulPaymentHandler } from './paymentHandler';

const holdStakeMock = vi.mocked(holdStake);

let chargeCounter = 0;
const nextChargeId = () => `charge-${++chargeCounter}`;

function makeCtx(chargeId: string, amount: number, payload: string) {
  return {
    message: {
      successful_payment: {
        telegram_payment_charge_id: chargeId,
        total_amount: amount,
        invoice_payload: payload,
      },
    },
    reply: vi.fn().mockResolvedValue(undefined),
  } as any;
}

describe('parseInvoicePayload', () => {
  it('parses valid payload', () => {
    const result = parseInvoicePayload('{"lobbyId":"l1","playerId":"p1","stakeAmount":50}');
    expect(result).toEqual({ lobbyId: 'l1', playerId: 'p1', stakeAmount: 50 });
  });

  it('throws on missing field', () => {
    expect(() => parseInvoicePayload('{"lobbyId":"l1","playerId":"p1"}')).toThrow();
  });

  it('throws on invalid JSON', () => {
    expect(() => parseInvoicePayload('not-json')).toThrow();
  });
});

describe('successfulPaymentHandler', () => {
  const validPayload = '{"lobbyId":"lobby1","playerId":"player1","stakeAmount":50}';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calls holdStake and replies with confirmation on success', async () => {
    holdStakeMock.mockResolvedValue({ id: 'tx1' } as any);
    const ctx = makeCtx(nextChargeId(), 50, validPayload);

    await successfulPaymentHandler(ctx);

    expect(holdStakeMock).toHaveBeenCalledOnce();
    expect(holdStakeMock).toHaveBeenCalledWith(
      expect.objectContaining({ playerId: 'player1', matchId: 'lobby1', amount: 50 }),
      'svc-token',
    );
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Payment confirmed'));
  });

  it('does not call holdStake for a duplicate charge id', async () => {
    holdStakeMock.mockResolvedValue({ id: 'tx2' } as any);
    const chargeId = 'charge-idem-unique';
    const ctx1 = makeCtx(chargeId, 50, validPayload);
    const ctx2 = makeCtx(chargeId, 50, validPayload);

    await successfulPaymentHandler(ctx1);
    await successfulPaymentHandler(ctx2);

    expect(holdStakeMock).toHaveBeenCalledOnce();
  });

  it('replies with support message and skips holdStake on invalid payload', async () => {
    const ctx = makeCtx(nextChargeId(), 50, 'bad-json');

    await successfulPaymentHandler(ctx);

    expect(holdStakeMock).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('support'));
  });

  it('replies with failure message when holdStake throws', async () => {
    holdStakeMock.mockRejectedValue(new Error('network error'));
    const ctx = makeCtx(nextChargeId(), 50, validPayload);

    await successfulPaymentHandler(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('failed'));
  });
});
