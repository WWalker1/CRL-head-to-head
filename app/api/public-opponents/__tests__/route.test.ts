/** @jest-environment node */
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../route';
import { checkAnonymousRateLimit } from '@/lib/anonymous-rate-limit';
import { reserveGameApi } from '@/lib/game-api-budget';
import { readPublicOpponentSnapshot } from '@/lib/public-player';

jest.mock('@/lib/anonymous-rate-limit', () => ({ checkAnonymousRateLimit: jest.fn() }));
jest.mock('@/lib/game-api-budget', () => ({ reserveGameApi: jest.fn() }));
jest.mock('@/lib/public-player', () => ({ ...jest.requireActual('@/lib/public-player'), readPublicOpponentSnapshot: jest.fn() }));
const limited = checkAnonymousRateLimit as jest.Mock;
const reserve = reserveGameApi as jest.Mock;
const snapshot = readPublicOpponentSnapshot as jest.Mock;
const release = jest.fn().mockResolvedValue(undefined);
const previous = process.env.PUBLIC_PLAYER_LOOKUP_ENABLED;
const request = (body: unknown = { playerTag: 'p0yq' }) => new NextRequest('http://localhost/api/public-opponents', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  jest.clearAllMocks();
  process.env.PUBLIC_PLAYER_LOOKUP_ENABLED = '1';
  limited.mockResolvedValue(null);
  reserve.mockResolvedValue({ release });
  snapshot.mockResolvedValue({ playerTag: '#P0YQ', score: null });
});
afterEach(() => { if (previous === undefined) delete process.env.PUBLIC_PLAYER_LOOKUP_ENABLED; else process.env.PUBLIC_PLAYER_LOOKUP_ENABLED = previous; });

it('defaults off before any budget, session or upstream work', async () => {
  delete process.env.PUBLIC_PLAYER_LOOKUP_ENABLED;
  expect((await POST(request())).status).toBe(404);
  expect(limited).not.toHaveBeenCalled();
  expect(snapshot).not.toHaveBeenCalled();
});

it('rejects malformed tags and oversized bodies before external work', async () => {
  for (const body of [null, [], 123, 'P0YQ', { playerTag: '../private' }, { playerTag: {} }, { playerTag: '#P0YQ', extra: 'x'.repeat(1500) }]) expect((await POST(request(body))).status).toBe(400);
  expect(limited).not.toHaveBeenCalled();
  expect(snapshot).not.toHaveBeenCalled();
});

it('rejects cross-site requests before consuming quota or contacting services', async () => {
  const input = request();
  input.headers.set('origin', 'https://unrelated.test');
  expect((await POST(input)).status).toBe(403);
  expect(limited).not.toHaveBeenCalled();
});

it('enforces the anonymous quota before the global game budget and any snapshot read', async () => {
  limited.mockResolvedValue(NextResponse.json({ error: 'limited' }, { status: 429 }));
  expect((await POST(request())).status).toBe(429);
  expect(reserve).not.toHaveBeenCalled();
  expect(snapshot).not.toHaveBeenCalled();
});

it('fails closed when the shared budget is unavailable', async () => {
  reserve.mockResolvedValue({ response: NextResponse.json({ error: 'unavailable' }, { status: 503 }) });
  expect((await POST(request())).status).toBe(503);
  expect(snapshot).not.toHaveBeenCalled();
});

it('needs no account, ignores submitted identity, and marks responses private/no-store', async () => {
  const response = await POST(request({ playerTag: 'p0yq', userId: 'victim', friendId: 'private' }));
  expect(response.status).toBe(200);
  expect(reserve).toHaveBeenCalledWith(expect.anything(), null, 'validate');
  expect(snapshot).toHaveBeenCalledWith('#P0YQ');
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(release).toHaveBeenCalledTimes(1);
});

it('returns a generic upstream error without exposing tokens or raw error bodies', async () => {
  snapshot.mockRejectedValue(new Error('private token detail'));
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain('private token');
  expect(release).toHaveBeenCalledTimes(1);
});
