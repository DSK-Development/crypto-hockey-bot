import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../keyboards/stakeKeyboard', () => ({
  parseStakeCallback: vi.fn(),
  stakeKeyboard: vi.fn(() => ({ inline_keyboard: [] })),
  STAKE_OPTIONS: [10, 50, 100],
}));

vi.mock('../config/env', () => ({
  config: {
    accountManagement: { serviceToken: 'svc-token' },
    bot: { webAppUrl: 'https://app.example.com' },
  },
}));

import { parseStakeCallback } from '../keyboards/stakeKeyboard';
import { stakeHandler, stakeBackHandler } from './stakeHandler';

const parseStakeCallbackMock = vi.mocked(parseStakeCallback);

function makeCtx() {
  return {
    callbackQuery: { data: 'stake:50' },
    editMessageText: vi.fn().mockResolvedValue(undefined),
    answerCbQuery: vi.fn().mockResolvedValue(undefined),
  } as any;
}

describe('stakeHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('only answers cbQuery when stake amount is invalid', async () => {
    parseStakeCallbackMock.mockReturnValue(null);
    const ctx = makeCtx();

    await stakeHandler(ctx);

    expect(ctx.answerCbQuery).toHaveBeenCalledOnce();
    expect(ctx.editMessageText).not.toHaveBeenCalled();
  });

  it('edits message with stake details and answers cbQuery for valid amount', async () => {
    parseStakeCallbackMock.mockReturnValue(50);
    const ctx = makeCtx();

    await stakeHandler(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledOnce();
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining('50'),
      expect.any(Object),
    );
    expect(ctx.answerCbQuery).toHaveBeenCalledOnce();
  });
});

describe('stakeBackHandler', () => {
  it('edits message with stake keyboard and answers cbQuery', async () => {
    const ctx = makeCtx();

    await stakeBackHandler(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining('Choose your stake'),
      expect.any(Object),
    );
    expect(ctx.answerCbQuery).toHaveBeenCalledOnce();
  });
});
