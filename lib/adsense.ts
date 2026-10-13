export type AdPlacement = 'home' | 'counter' | 'skill';

// Public account identifier supplied by the site owner; not a credential.
const SITE_PUBLISHER_ID = 'ca-pub-9380315908761258';

// Server-only configuration: no ad requests in development or Vercel previews.
export function getAdSenseConfig(env: Readonly<Record<string, string | undefined>> = process.env) {
  const production = env.NODE_ENV === 'production' &&
    env.VERCEL_ENV !== 'preview' &&
    env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') === 'https://rival-royale.com';
  const publisher = (env.ADSENSE_PUBLISHER_ID ?? SITE_PUBLISHER_ID).trim();
  const publisherId = production && /^ca-pub-\d{16}$/.test(publisher) ? publisher : '';
  const slots: Record<AdPlacement, string | undefined> = {
    home: env.ADSENSE_SLOT_HOME,
    counter: env.ADSENSE_SLOT_COUNTER,
    skill: env.ADSENSE_SLOT_SKILL,
  };
  return {
    publisherId,
    enabled: Boolean(publisherId) && env.ADSENSE_ENABLED === '1',
    slots,
  };
}
