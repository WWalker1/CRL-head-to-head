import { createClient } from '@supabase/supabase-js';
import type { RivalrySnapshot } from './rivalry-sharing';

// A server-side HTTP request to our own API fails on protected Preview deployments.
export async function getPublicRivalrySnapshot(shareId: string): Promise<RivalrySnapshot | null> {
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(shareId)) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.from('rivalry_shares')
    .select('snapshot,revoked_at').eq('share_id', shareId).maybeSingle();
  if (error || !data || data.revoked_at) return null;
  return data.snapshot as RivalrySnapshot;
}
