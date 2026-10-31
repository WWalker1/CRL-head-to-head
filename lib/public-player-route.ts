import { NextRequest, NextResponse } from 'next/server';
import { checkAnonymousRateLimit } from './anonymous-rate-limit';
import { reserveGameApi } from './game-api-budget';
import { normalizePlayerTag } from './player-tag';
import { readModelBody } from './model-access';

const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' };

/** Cache hits and both public tools share the same durable request limits. */
export async function handlePublicPlayerRequest(request: NextRequest, read: (tag: string) => Promise<unknown>) {
  if (process.env.PUBLIC_PLAYER_LOOKUP_ENABLED !== '1') return NextResponse.json({ error: 'Public lookup is not available yet.' }, { status: 404, headers });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403, headers });
  let tag: string | null;
  try {
    const body = JSON.parse(await readModelBody(request, 1024));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid lookup');
    tag = normalizePlayerTag(body.playerTag);
  } catch { tag = null; }
  if (!tag) return NextResponse.json({ error: 'Enter a valid player tag.' }, { status: 400, headers });
  const limited = await checkAnonymousRateLimit(request, 'player_validation');
  if (limited) { for (const [key, value] of Object.entries(headers)) limited.headers.set(key, value); return limited; }
  const reservation = await reserveGameApi(request, null, 'validate');
  if (reservation.response) { for (const [key, value] of Object.entries(headers)) reservation.response.headers.set(key, value); return reservation.response; }
  try { return NextResponse.json(await read(tag), { headers }); }
  catch (error) {
    const missing = error instanceof Error && error.message.startsWith('Clash Royale API error: 404');
    return NextResponse.json({ error: missing ? 'Player not found. Check the tag in your in-game profile.' : 'Recent battles are unavailable. Try again later.' }, { status: missing ? 404 : 503, headers });
  } finally { await reservation.release(); }
}
