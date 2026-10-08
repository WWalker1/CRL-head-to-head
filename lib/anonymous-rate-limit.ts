import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

type Operation = 'model_read' | 'player_validation' | 'counter_search';

/** A shared database limit for public endpoints; only a keyed digest of the address is stored. */
export async function checkAnonymousRateLimit(request: NextRequest, operation: Operation): Promise<NextResponse | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Public request limits are unavailable.' }, { status: 503 });

  // Vercel supplies this header at the edge. In local development, the final
  // forwarded address is used so clients cannot choose the first entry.
  const forwarded = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for');
  const address = forwarded?.split(',').at(-1)?.trim() || 'unknown';
  const digest = createHmac('sha256', key).update(address).digest('hex');
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = operation === 'counter_search'
      ? await supabase.rpc('consume_anonymous_counter_quota', { address_digest: digest })
      : await supabase.rpc('consume_anonymous_api_quota', { operation, address_digest: digest });
    if (error) throw error;
    if (!data) {
      const daily = operation === 'counter_search';
      const now = new Date();
      const retryAfter = daily ? Math.max(1, Math.ceil((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime()) / 1000)) : 60;
      return NextResponse.json({ error: daily ? 'Free counter searches are used for today. Sign in or try again tomorrow.' : 'Usage limit reached. Try again in a minute.' }, {
        status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' },
      });
    }
    return null;
  } catch {
    return NextResponse.json({ error: 'Public request limits are unavailable.' }, { status: 503 });
  }
}
