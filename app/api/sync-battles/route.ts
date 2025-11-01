import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncBattlesForUser } from '@/utils/battleProcessor';

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

    // Get user's player tag from metadata
    const playerTag = user.user_metadata?.player_tag;

    if (!playerTag) {
      return NextResponse.json({ error: 'Player tag not found' }, { status: 400 });
    }

    // Sync battles
    const result = await syncBattlesForUser(user.id, playerTag);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error syncing battles:', error);
    return NextResponse.json(
      { error: 'Failed to sync battles', details: error.message },
      { status: 500 }
    );
  }
}

