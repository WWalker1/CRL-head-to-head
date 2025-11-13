import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPlayerInfo } from '@/lib/clashRoyaleApi';

const DEFAULT_ELO = 1500;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { friendTag } = await request.json();

    if (!friendTag) {
      return NextResponse.json({ error: 'Friend tag is required' }, { status: 400 });
    }

    // Validate friend exists in Clash Royale
    const friendInfo = await getPlayerInfo(friendTag);

    // Check if already tracking this friend
    const { data: existing } = await supabase
      .from('tracked_friends')
      .select('id')
      .eq('user_id', user.id)
      .eq('friend_player_tag', friendInfo.tag)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Already tracking this friend' }, { status: 400 });
    }

    // Add friend
    const { data, error } = await supabase
      .from('tracked_friends')
      .insert({
        user_id: user.id,
        friend_player_tag: friendInfo.tag,
        friend_name: friendInfo.name,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to add friend' }, { status: 500 });
    }

    const { error: ratingUpsertError } = await supabase
      .from('user_ratings')
      .upsert({ user_id: user.id, elo_rating: DEFAULT_ELO }, { onConflict: 'user_id' });

    if (ratingUpsertError) {
      console.error('Failed to initialize user rating:', ratingUpsertError);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message?.includes('Clash Royale API error')) {
      return NextResponse.json({ error: 'Invalid player tag' }, { status: 400 });
    }
    console.error('Error adding friend:', error);
    return NextResponse.json({ error: 'Failed to add friend' }, { status: 500 });
  }
}

