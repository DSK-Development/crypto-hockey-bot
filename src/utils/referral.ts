const REFERRAL_PREFIX = 'ref_';

export function parseReferralCode(startPayload: string | undefined): string | null {
  if (!startPayload?.startsWith(REFERRAL_PREFIX)) return null;
  const code = startPayload.slice(REFERRAL_PREFIX.length).trim();
  return code.length > 0 ? code : null;
}

export function buildWebAppUrl(baseUrl: string, referralCode: string | null): string {
  if (!referralCode) return baseUrl;
  const url = new URL(baseUrl);
  url.searchParams.set('ref', referralCode);
  return url.toString();
}
