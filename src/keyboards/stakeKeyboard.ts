import { InlineKeyboardMarkup } from 'telegraf/types';

export const STAKE_OPTIONS = [10, 50, 100] as const;
export type StakeAmount = (typeof STAKE_OPTIONS)[number];

export function stakeKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      STAKE_OPTIONS.map((amount) => ({
        text: `⭐ ${amount} Stars`,
        callback_data: `stake:${amount}`,
      })),
    ],
  };
}

export function parseStakeCallback(data: string): StakeAmount | null {
  const [prefix, raw] = data.split(':');
  if (prefix !== 'stake') return null;
  const amount = Number(raw);
  if ((STAKE_OPTIONS as readonly number[]).includes(amount)) {
    return amount as StakeAmount;
  }
  return null;
}
