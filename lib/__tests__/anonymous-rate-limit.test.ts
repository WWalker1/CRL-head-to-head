/** @jest-environment node */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAnonymousRateLimit } from '../anonymous-rate-limit';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

describe('anonymous API quota', () => {
  const oldEnv = process.env;
  const rpc = jest.fn();
  beforeEach(() => {
    process.env = { ...oldEnv, NEXT_PUBLIC_SUPABASE_URL: 'https://db.example', SUPABASE_SERVICE_ROLE_KEY: 'test-only-secret' };
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue({ rpc });
    rpc.mockResolvedValue({ data: true, error: null });
  });
  afterEach(() => { process.env = oldEnv; });

  it('uses a stable digest and never sends the address to the database', async () => {
    const request = new NextRequest('https://rival.example/api/model/catalog', { headers: { 'x-forwarded-for': 'attacker-selected, 203.0.113.4' } });
    expect(await checkAnonymousRateLimit(request, 'model_read')).toBeNull();
    expect(await checkAnonymousRateLimit(request, 'model_read')).toBeNull();
    const args = rpc.mock.calls.map((call) => call[1]);
    expect(args[0]).toEqual({ operation: 'model_read', address_digest: expect.stringMatching(/^[0-9a-f]{64}$/) });
    expect(args[0]).toEqual(args[1]);
    expect(JSON.stringify(args)).not.toContain('203.0.113.4');
  });

  it('fails closed when the shared quota is exceeded or unavailable', async () => {
    const request = new NextRequest('https://rival.example/api/validate-player');
    rpc.mockResolvedValueOnce({ data: false, error: null });
    const limited = await checkAnonymousRateLimit(request, 'player_validation');
    expect(limited?.status).toBe(429);
    expect(limited?.headers.get('retry-after')).toBe('60');
    rpc.mockResolvedValueOnce({ data: null, error: new Error('unavailable') });
    expect((await checkAnonymousRateLimit(request, 'player_validation'))?.status).toBe(503);
  });
  it('uses the dedicated daily counter quota and returns a next-day retry time', async () => {
    const request = new NextRequest('https://rival.example/api/model/counter', { headers: { 'x-vercel-forwarded-for': '203.0.113.5' } });
    rpc.mockResolvedValueOnce({ data: true, error: null });
    rpc.mockResolvedValueOnce({ data: true, error: null });
    rpc.mockResolvedValueOnce({ data: true, error: null });
    rpc.mockResolvedValueOnce({ data: false, error: null });
    for (let i = 0; i < 3; i++) expect(await checkAnonymousRateLimit(request, 'counter_search')).toBeNull();
    const blocked = await checkAnonymousRateLimit(request, 'counter_search');
    expect(blocked?.status).toBe(429);
    expect(Number(blocked?.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(Number(blocked?.headers.get('Retry-After'))).toBeLessThanOrEqual(86400);
    expect(rpc).toHaveBeenCalledTimes(4);
    for (const [name, args] of rpc.mock.calls) {
      expect(name).toBe('consume_anonymous_counter_quota');
      expect(args).toEqual({ address_digest: expect.stringMatching(/^[0-9a-f]{64}$/) });
    }
  });
});
