import { getAdSenseConfig } from '../adsense';

const production: NodeJS.ProcessEnv = {
  NODE_ENV: 'production', VERCEL_ENV: 'production',
  NEXT_PUBLIC_SITE_URL: 'https://rival-royale.com',
  ADSENSE_PUBLISHER_ID: 'ca-pub-1234567890123456', ADSENSE_ENABLED: '1',
};

describe('AdSense activation boundaries', () => {
  it('publishes the owner-supplied verification ID without enabling ad requests', () => {
    expect(getAdSenseConfig({ NODE_ENV: 'production', VERCEL_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://rival-royale.com' }))
      .toMatchObject({ publisherId: 'ca-pub-9380315908761258', enabled: false });
  });
  it('supports verification before ad serving is enabled', () => {
    expect(getAdSenseConfig({ ...production, ADSENSE_ENABLED: '0' })).toMatchObject({
      publisherId: production.ADSENSE_PUBLISHER_ID, enabled: false,
    });
  });
  it.each([
    { NODE_ENV: 'development' }, { VERCEL_ENV: 'preview' },
    { NEXT_PUBLIC_SITE_URL: 'https://beta.rival-royale.com' },
    { NEXT_PUBLIC_SITE_URL: 'https://rival-royale.com.attacker.example' },
    { ADSENSE_PUBLISHER_ID: 'not-a-publisher' }, { ADSENSE_PUBLISHER_ID: '' },
  ])('does not enable ads or verification for %j', (override) => {
    expect(getAdSenseConfig({ ...production, ...override })).toMatchObject({ publisherId: '', enabled: false });
  });
  it('enables configured production ads explicitly', () => {
    expect(getAdSenseConfig(production).enabled).toBe(true);
  });
});
