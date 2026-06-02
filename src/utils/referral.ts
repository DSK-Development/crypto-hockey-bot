const REFERRAL_PREFIX = 'ref_';

export function parseReferralCode(startPayload: string | undefined): string | null {
  if (!startPayload?.startsWith(REFERRAL_PREFIX)) return null;
  const code = startPayload.slice(REFERRAL_PREFIX.length).trim();
  return code.length > 0 ? code : null;
}

export function buildWebAppUrl(baseUrl: string, referralCode: string | null, matchId?: string): string {
  const url = new URL(baseUrl);
  if (referralCode) url.searchParams.set('ref', referralCode);
  // matchId goes in the query string: Telegram preserves query params but
  // overwrites the URL hash with its own launch params (tgWebAppData, ...).
  if (matchId) url.searchParams.set('matchId', matchId);
  return url.toString();
}
