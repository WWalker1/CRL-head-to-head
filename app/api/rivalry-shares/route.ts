import { NextRequest, NextResponse } from 'next/server';
import { createClient as sessionClient } from '@/lib/supabase-server';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { summarizeFriendHistory } from '@/lib/friend-history';
import { createShareId, createSnapshot } from '@/lib/rivalry-sharing';

function db() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? createSupabase(url, key) : null; }
async function auth(request: NextRequest) {
  const client = db(); if (!client) return null;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (token) { const { data } = await client.auth.getUser(token); return data.user || null; }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const session = await sessionClient(); const { data } = await session.auth.getUser(); return data.user || null;
}

export async function GET(request: NextRequest) {
  const shareId = new URL(request.url).searchParams.get('shareId'); if (!shareId) return NextResponse.json({ error: 'shareId is required' }, { status: 400 });
  const client = db(); if (!client) return NextResponse.json({ error: 'Sharing unavailable' }, { status: 503 });
  const { data, error } = await client.from('rivalry_shares').select('snapshot,revoked_at').eq('share_id', shareId).maybeSingle();
  if (error || !data || data.revoked_at) return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  return NextResponse.json({ snapshot: data.snapshot }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const user = await auth(request); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const client = db()!; let body: any; try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { data: friend } = await client.from('tracked_friends').select('id,friend_name,friend_player_tag,total_wins,total_losses,created_at').eq('id', body.friendId).eq('user_id', user.id).maybeSingle();
  if (!friend) return NextResponse.json({ error: 'Friend not found' }, { status: 404 });
  const { data: rows } = await client.from('friend_match_history').select('physical_match_id,battle_time,mode,friend_result,friend_deck,opponent_deck').eq('tracked_friend_id', friend.id).order('battle_time', { ascending: false }).limit(100);
  const snapshot = createSnapshot(friend, summarizeFriendHistory(rows || []), body.includeDecks === true);
  const shareId = createShareId(); const { error } = await client.from('rivalry_shares').insert({ share_id: shareId, owner_user_id: user.id, tracked_friend_id: friend.id, snapshot });
  if (error) return NextResponse.json({ error: 'Unable to create share' }, { status: 503 });
  return NextResponse.json({ shareId, snapshot }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await auth(request); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const shareId = new URL(request.url).searchParams.get('shareId'); if (!shareId) return NextResponse.json({ error: 'shareId is required' }, { status: 400 });
  const { error } = await db()!.from('rivalry_shares').update({ revoked_at: new Date().toISOString() }).eq('share_id', shareId).eq('owner_user_id', user.id);
  if (error) return NextResponse.json({ error: 'Unable to revoke share' }, { status: 503 });
  return NextResponse.json({ revoked: true });
}
