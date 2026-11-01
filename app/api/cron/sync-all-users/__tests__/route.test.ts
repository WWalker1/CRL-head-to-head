/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET } from '../route';

// Even an authenticated legacy invocation must never launch another collector.
jest.mock('@/utils/battleProcessor', () => ({ syncBattlesForUser: jest.fn() }));
import { syncBattlesForUser } from '@/utils/battleProcessor';

const original = process.env.CRON_SECRET;
afterEach(() => {
  if (original === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = original;
  jest.clearAllMocks();
});
const request = (token?: string) => new NextRequest('https://rival-royale.com/api/cron/sync-all-users', {
  headers: token ? { authorization: `Bearer ${token}` } : {},
});
it('requires valid authentication for the retired endpoint', async () => {
  process.env.CRON_SECRET = 'test-secret';
  expect((await GET(request())).status).toBe(401);
  expect((await GET(request('wrong'))).status).toBe(401);
  expect(syncBattlesForUser).not.toHaveBeenCalled();
});
it('fails closed when the secret is not configured', async () => {
  delete process.env.CRON_SECRET;
  expect((await GET(request('undefined'))).status).toBe(401);
  expect(syncBattlesForUser).not.toHaveBeenCalled();
});
it('returns Gone without syncing even for the former cron credential', async () => {
  process.env.CRON_SECRET = 'test-secret';
  const response = await GET(request('test-secret'));
  expect(response.status).toBe(410);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(syncBattlesForUser).not.toHaveBeenCalled();
});
