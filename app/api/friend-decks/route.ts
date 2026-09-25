import { NextRequest, NextResponse } from 'next/server';
import { createClient as sessionClient } from '@/lib/supabase-server';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { getPlayerBattleLog } from '@/lib/clashRoyaleApi';
import { normalizeBattle, summarizeFriendHistory } from '@/lib/friend-history';

function db() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? createSupabase(url, key) : null; }
async function auth(request: NextRequest) {
  const client = db(); if (!client) return null;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (token) { const { data } = await client.auth.getUser(token); return data.user || null; }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const session = await sessionClient(); const { data } = await session.auth.getUser(); return data.user || null;
}
async function friendFor(client: any, userId: string, friendId: string) { return client.from('tracked_friends').select('id,friend_name,friend_player_tag,total_wins,total_losses').eq('id', friendId).eq('user_id', userId).maybeSingle(); }
async function stored(client: any, friend: any, userId: string) { return client.from('friend_match_history').select('physical_match_id,battle_time,mode,friend_result,friend_deck,opponent_deck').eq('tracked_friend_id', friend.id).eq('user_id', userId).order('battle_time', { ascending: false }).limit(100); }

export async function GET(request: NextRequest) {
  const user = await auth(request); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const client = db()!; const friendId = new URL(request.url).searchParams.get('friendId'); if (!friendId) return NextResponse.json({ error: 'friendId is required' }, { status: 400 });
  const { data: friend, error: friendError } = await friendFor(client, user.id, friendId); if (friendError || !friend) return NextResponse.json({ error: 'Friend not found' }, { status: 404 });
  const { data: rows, error } = await stored(client, friend, user.id); if (error) return NextResponse.json({ error: 'History unavailable' }, { status: 503 });
  return NextResponse.json({ friend, summary: summarizeFriendHistory(rows || []) });
}

/** Refreshes from the authoritative friend log. The client cannot submit fabricated matches. */
export async function POST(request: NextRequest) {
  const user = await auth(request); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const client = db()!; let body: any; try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (typeof body?.friendId !== 'string') return NextResponse.json({ error: 'friendId is required' }, { status: 400 });
  const { data: friend } = await friendFor(client, user.id, body.friendId); if (!friend) return NextResponse.json({ error: 'Friend not found' }, { status: 404 });
  let battles; try { battles = await getPlayerBattleLog(friend.friend_player_tag); } catch { return NextResponse.json({ error: 'Friend history unavailable' }, { status: 503 }); }
  const rows = battles.map(battle => normalizeBattle(battle as any, friend.friend_player_tag)).filter(Boolean).map((row: any) => ({ ...row, tracked_friend_id: friend.id, user_id: user.id }));
  if (rows.length) { const { error } = await client.from('friend_match_history').upsert(rows, { onConflict: 'tracked_friend_id,physical_match_id', ignoreDuplicates: true }); if (error) return NextResponse.json({ error: 'History unavailable' }, { status: 503 }); }
  const { data: latest } = await stored(client, friend, user.id); return NextResponse.json({ accepted: rows.length, friend, summary: summarizeFriendHistory(latest || []) });
}
