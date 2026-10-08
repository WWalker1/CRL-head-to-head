/** @jest-environment node */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { reserveGameApi } from '../game-api-budget';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

describe('shared game API protection', () => {
  const oldEnv = process.env;
  const rpc = jest.fn();
  const request = new NextRequest('https://rival.example/api/sync-battles', { headers: { 'x-vercel-forwarded-for': '203.0.113.7' } });
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...oldEnv, NEXT_PUBLIC_SUPABASE_URL: 'https://db.example', SUPABASE_SERVICE_ROLE_KEY: 'test-secret' };
    (createClient as jest.Mock).mockReturnValue({ rpc });
    rpc.mockResolvedValue({ data: { allowed: true, lease_id: 'request-lease' }, error: null });
  });
  afterEach(() => { process.env = oldEnv; });

  it('reserves before work and releases only the acquired account/token pair', async () => {
    const reservation = await reserveGameApi(request, 'owner', 'sync');
    expect(reservation.response).toBeUndefined();
    expect(rpc).toHaveBeenCalledWith('acquire_game_api_budget', {
      p_user_id: 'owner', p_operation: 'sync', p_address_digest: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('203.0.113.7');
    await reservation.release?.();
    expect(rpc).toHaveBeenLastCalledWith('release_game_api_budget', { p_user_id: 'owner', p_lease_id: 'request-lease' });
  });

  it('returns the durable cooldown on denial', async () => {
    rpc.mockResolvedValue({ data: { allowed: false, retry_after: 243 }, error: null });
    const reservation = await reserveGameApi(request, 'owner', 'friend_refresh');
    expect(reservation.response?.status).toBe(429);
    expect(reservation.response?.headers.get('Retry-After')).toBe('243');
    expect(reservation.release).toBeUndefined();
  });

  it.each([
    { data: null, error: new Error('database unavailable') },
    { data: null, error: null },
    { data: { allowed: true }, error: null },
  ])('fails closed on unavailable or malformed quota data: %j', async (result) => {
    rpc.mockResolvedValue(result);
    expect((await reserveGameApi(request, 'owner', 'sync')).response?.status).toBe(503);
  });

  it('fails closed on thrown quota errors or missing configuration', async () => {
    rpc.mockRejectedValue(new Error('network unavailable'));
    expect((await reserveGameApi(request, 'owner', 'sync')).response?.status).toBe(503);
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect((await reserveGameApi(request, 'owner', 'sync')).response?.status).toBe(503);
  });

  it('reserves anonymous player validation against the shared budget without an account lease', async () => {
    rpc.mockResolvedValue({ data: { allowed: true, lease_id: null }, error: null });
    const reservation = await reserveGameApi(request, null, 'validate');
    expect(reservation.response).toBeUndefined();
    await reservation.release?.();
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
