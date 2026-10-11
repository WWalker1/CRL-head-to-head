/** @jest-environment node */
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { GET, POST } from '../[action]/route';
jest.mock('@/lib/supabase-server', () => ({ createClient: jest.fn() }));
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/anonymous-rate-limit', () => ({ checkAnonymousRateLimit: jest.fn() }));
import { checkAnonymousRateLimit } from '@/lib/anonymous-rate-limit';

describe('model proxy', () => {
  const oldEnv = process.env;
  const oldFetch = global.fetch;
  const client = { auth: { getUser: jest.fn() }, rpc: jest.fn() };
  beforeEach(() => {
    process.env = { ...oldEnv, NODE_ENV: 'production', MODEL_TOOLS_ENABLED: '1', MODEL_SERVICE_URL: 'http://model:8768', MODEL_SERVICE_TOKEN: 'test-only-token', NEXT_PUBLIC_SITE_URL: 'https://rival.example', NEXT_PUBLIC_SUPABASE_URL: 'http://db', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-only' };
    jest.resetAllMocks();
    (createClient as jest.Mock).mockResolvedValue(client);
    (createSupabase as jest.Mock).mockReturnValue(client);
    (checkAnonymousRateLimit as jest.Mock).mockResolvedValue(null);
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'user' } }, error: null });
    client.rpc.mockResolvedValue({ data: true, error: null });
    global.fetch = jest.fn().mockImplementation(async () => new Response(JSON.stringify({ probability_a: .6 }), { status: 200 }));
  });
  afterEach(() => { process.env = oldEnv; global.fetch = oldFetch; });
  const context = (action: string) => ({ params: Promise.resolve({ action }) });
  const request = (body = '{}', origin = 'https://rival.example') => new NextRequest('https://rival.example/api/model/predict', { method: 'POST', body, headers: { origin } });
  it('does not accept local bypass in production', async () => {
    process.env.MODEL_LOCAL_PREVIEW = '1'; client.auth.getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(request(), context('predict'))).status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('requires a working quota check', async () => {
    client.rpc.mockResolvedValue({ data: false });
    expect((await POST(request(), context('counter'))).status).toBe(429);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('allows three anonymous counter searches, then rejects the fourth', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    (checkAnonymousRateLimit as jest.Mock)
      .mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null)
      .mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'Retry-After': '3600' } }));
    for (let attempt = 0; attempt < 3; attempt++) {
      expect((await POST(request('{"target":{}}'), context('counter'))).status).toBe(200);
    }
    const blocked = await POST(request('{"target":{}}'), context('counter'));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBe('3600');
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(client.rpc).not.toHaveBeenCalled();
    expect(checkAnonymousRateLimit).toHaveBeenCalledTimes(4);
    expect(checkAnonymousRateLimit).toHaveBeenCalledWith(expect.any(NextRequest), 'counter_search');
  });
  it('keeps signed-in searches on the per-user quota and predictions behind sign-in', async () => {
    expect((await POST(request(), context('counter'))).status).toBe(200);
    expect(client.rpc).toHaveBeenCalledWith('consume_model_quota', { operation: 'search' });
    expect(checkAnonymousRateLimit).not.toHaveBeenCalled();
    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(request(), context('predict'))).status).toBe(401);
    expect(checkAnonymousRateLimit).not.toHaveBeenCalled();
  });
  it('accepts a refreshed browser bearer token for a signed-in counter search', async () => {
    const authenticated = new NextRequest('https://rival.example/api/model/counter', {
      method: 'POST', body: '{"target":{}}',
      headers: { origin: 'https://rival.example', authorization: 'Bearer refreshed-token' },
    });
    expect((await POST(authenticated, context('counter'))).status).toBe(200);
    expect(client.auth.getUser).toHaveBeenCalledWith('refreshed-token');
    expect(createSupabase).toHaveBeenCalledWith('http://db', 'test-only', expect.objectContaining({
      global: { headers: { Authorization: 'Bearer refreshed-token' } },
    }));
    expect(client.rpc).toHaveBeenCalledWith('consume_model_quota', { operation: 'search' });
    expect(checkAnonymousRateLimit).not.toHaveBeenCalled();
  });
  it('rejects anonymous counter requests without a same-site origin or valid bounded body', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const noOrigin = new NextRequest('https://rival.example/api/model/counter', { method: 'POST', body: '{}' });
    expect((await POST(noOrigin, context('counter'))).status).toBe(403);
    expect((await POST(request('{}', 'https://other.example'), context('counter'))).status).toBe(403);
    expect((await POST(request(JSON.stringify({ x: 'x'.repeat(33000) })), context('counter'))).status).toBe(413);
    expect(checkAnonymousRateLimit).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('rejects cross-site writes', async () => {
    expect((await POST(request('{}', 'https://other.example'), context('predict'))).status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('forwards only allowlisted operations with a server-held token', async () => {
    expect((await POST(request('{"target":{}}'), context('counter'))).status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith('http://model:8768/counter', expect.objectContaining({ body: '{"target":{}}', headers: expect.objectContaining({ Authorization: 'Bearer test-only-token' }) }));
    expect((await POST(request(), context('complete'))).status).toBe(404);
    expect((await GET(new NextRequest('https://rival.example/api/model/health'), context('health'))).status).toBe(404);
  });
  it('limits public model reads before forwarding', async () => {
    (checkAnonymousRateLimit as jest.Mock).mockResolvedValueOnce(new Response('{}', { status: 429 }));
    expect((await GET(new NextRequest('https://rival.example/api/model/catalog'), context('catalog'))).status).toBe(429);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(checkAnonymousRateLimit).toHaveBeenCalledWith(expect.any(NextRequest), 'model_read');
  });
  it('omits build-machine paths from the public catalog', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      catalog_source: 'C:\\private\\cards.json', dataset: 'C:\\private\\training', variants: [{ key: 'card' }],
    }), { status: 200 }));
    const response = await GET(new NextRequest('https://rival.example/api/model/catalog'), context('catalog'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ variants: [{ key: 'card' }] });
  });
  it('limits bodies and hides service tracebacks', async () => {
    expect((await POST(request(JSON.stringify({ x: 'x'.repeat(33000) })), context('predict'))).status).toBe(413);
    global.fetch = jest.fn().mockResolvedValue(new Response('{"trace":"private"}', { status: 500 }));
    const response = await POST(request(), context('predict'));
    expect(response.status).toBe(503); expect(await response.text()).not.toContain('private');
  });
});
