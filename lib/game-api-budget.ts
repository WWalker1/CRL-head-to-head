import { createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Operation = 'sync' | 'friend_refresh' | 'add_friend' | 'validate';
type Reservation = { response: NextResponse; release?: never } | { response?: never; release: () => Promise<void> };

/** Shared, fail-closed protection before any user-triggered game API work. */
export async function reserveGameApi(request: NextRequest, userId: string | null, operation: Operation): Promise<Reservation> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const unavailable = () => ({ response: NextResponse.json({ error: 'Refresh limits are unavailable. Try again shortly.' }, { status: 503 }) });
  if (!url || !key) return unavailable();
  const forwarded = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for');
  const address = forwarded?.split(',').at(-1)?.trim() || 'unknown';
  const addressDigest = createHmac('sha256', key).update(address).digest('hex');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data, error } = await client.rpc('acquire_game_api_budget', {
      p_user_id: userId, p_address_digest: addressDigest, p_operation: operation,
    });
    if (error || typeof data?.allowed !== 'boolean') return unavailable();
    if (!data.allowed) {
      const seconds = Number(data.retry_after);
      const retryAfter = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 60;
      return { response: NextResponse.json({ error: 'Please wait before refreshing again.', retryAfter }, {
        status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' },
      }) };
    }
    if (userId && (typeof data.lease_id !== 'string' || !data.lease_id)) return unavailable();
    return { release: async () => {
      if (!userId) return;
      try {
        const { error: releaseError } = await client.rpc('release_game_api_budget', { p_user_id: userId, p_lease_id: data.lease_id });
        if (releaseError) console.error('Could not release refresh reservation. It will expire automatically.');
      } catch { console.error('Could not release refresh reservation. It will expire automatically.'); }
    } };
  } catch { return unavailable(); }
}
