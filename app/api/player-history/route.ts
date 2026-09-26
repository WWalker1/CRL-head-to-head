import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { readHistoryInsights } from '@/lib/history-insights';

export const maxDuration = 30;
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return NextResponse.json({ error: 'History is not configured.' }, { status: 503 });
  const session = await createClient();
  const { data: { user }, error } = await session.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tag = user.user_metadata?.player_tag;
  if (typeof tag !== 'string' || !tag) return NextResponse.json({ error: 'Player tag not found.' }, { status: 400 });
  try {
    const insights = await readHistoryInsights(createAdmin(url, key), { userId: user.id, playerTag: tag });
    return NextResponse.json(insights, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'History unavailable. Apply migration 009 and sync battles.' }, { status: 503 }); }
}
