import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const { playerTags } = await request.json();

    if (!playerTags || !Array.isArray(playerTags) || playerTags.length === 0) {
      return NextResponse.json({ ratings: [] });
    }

    // Fetch ELO ratings from user_ratings table using service role key (bypasses RLS)
    const { data: ratingsData, error: ratingsError } = await supabase
      .from('user_ratings')
      .select('player_tag, elo_rating')
      .in('player_tag', playerTags);

    if (ratingsError) {
      console.error('Error fetching friend ratings:', ratingsError);
      return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
    }

    // Return map of player_tag to elo_rating
    const ratingsMap: Record<string, number> = {};
    (ratingsData || []).forEach(r => {
      if (r.player_tag && r.elo_rating !== undefined) {
        ratingsMap[r.player_tag] = r.elo_rating;
      }
    });

    return NextResponse.json({ ratings: ratingsMap });
  } catch (error: any) {
    console.error('Error fetching friend ratings:', error);
    return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
  }
}

