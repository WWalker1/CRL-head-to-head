/** @jest-environment node */
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { GET, POST } from '../[action]/route';
jest.mock('@/lib/supabase-server', () => ({ createClient: jest.fn() }));

describe('model proxy', () => {
  const oldEnv = process.env;
  const oldFetch = global.fetch;
  const client = { auth: { getUser: jest.fn() }, rpc: jest.fn() };
  beforeEach(() => {
    process.env = { ...oldEnv, NODE_ENV: 'production', MODEL_TOOLS_ENABLED: '1', MODEL_SERVICE_URL: 'http://model:8768', MODEL_SERVICE_TOKEN: 'test-only-token', NEXT_PUBLIC_SITE_URL: 'https://rival.example', NEXT_PUBLIC_SUPABASE_URL: 'http://db', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-only' };
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(client);
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'user' } }, error: null });
    client.rpc.mockResolvedValue({ data: true, error: null });
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ probability_a: .6 }), { status: 200 }));
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
    expect((await POST(request(), context('complete'))).status).toBe(429);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('rejects cross-site writes', async () => {
    expect((await POST(request('{}', 'https://other.example'), context('predict'))).status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('forwards only allowlisted operations with a server-held token', async () => {
    expect((await POST(request('{"locked":[]}'), context('complete'))).status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith('http://model:8768/complete', expect.objectContaining({ body: '{"locked":[]}', headers: expect.objectContaining({ Authorization: 'Bearer test-only-token' }) }));
    expect((await GET(new NextRequest('https://rival.example/api/model/health'), context('health'))).status).toBe(404);
  });
  it('limits bodies and hides service tracebacks', async () => {
    expect((await POST(request(JSON.stringify({ x: 'x'.repeat(33000) })), context('predict'))).status).toBe(413);
    global.fetch = jest.fn().mockResolvedValue(new Response('{"trace":"private"}', { status: 500 }));
    const response = await POST(request(), context('predict'));
    expect(response.status).toBe(503); expect(await response.text()).not.toContain('private');
  });
});
