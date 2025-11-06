import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncBattlesForUser } from '@/utils/battleProcessor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UserSyncResult {
  userId: string;
  email?: string;
  playerTag?: string;
  success: boolean;
  result?: {
    battlesProcessed: number;
    recordsUpdated: number;
    newBattles: number;
    errors: string[];
  };
  error?: string;
}

interface CronSyncResponse {
  success: boolean;
  totalUsers: number;
  usersWithPlayerTag: number;
  usersProcessed: number;
  usersSucceeded: number;
  usersFailed: number;
  results: UserSyncResult[];
  errors: string[];
}

// Force dynamic execution to prevent caching
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify request is from Vercel Cron
    // Vercel sends x-vercel-cron header with value "1" for cron jobs
    const cronHeader = request.headers.get('x-vercel-cron');
    const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
    const expectedSecret = process.env.CRON_SECRET;

    // Vercel automatically sends x-vercel-cron header with value "1", or we can verify CRON_SECRET
    const isVercelCron = cronHeader === '1';
    const isValidSecret = expectedSecret && cronSecret === expectedSecret;

    if (!isVercelCron && !isValidSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting daily sync for all users...');

    // Fetch all users from Supabase Auth
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users', details: usersError.message },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        totalUsers: 0,
        usersWithPlayerTag: 0,
        usersProcessed: 0,
        usersSucceeded: 0,
        usersFailed: 0,
        results: [],
        errors: [],
      });
    }

    // Filter users with player_tag in metadata
    const usersWithPlayerTag = users.filter(
      (user) => user.user_metadata?.player_tag
    );

    console.log(
      `Found ${users.length} total users, ${usersWithPlayerTag.length} with player_tag`
    );

    const results: UserSyncResult[] = [];
    let usersSucceeded = 0;
    let usersFailed = 0;

    // Process users sequentially to avoid API rate limits
    for (const user of usersWithPlayerTag) {
      const playerTag = user.user_metadata.player_tag;
      const userResult: UserSyncResult = {
        userId: user.id,
        email: user.email,
        playerTag,
        success: false,
      };

      try {
        console.log(`Syncing battles for user ${user.id} (${playerTag})...`);
        const syncResult = await syncBattlesForUser(user.id, playerTag);
        
        userResult.success = true;
        userResult.result = syncResult;
        usersSucceeded++;
        
        console.log(
          `Successfully synced for user ${user.id}: ${syncResult.newBattles} new battles, ${syncResult.errors.length} errors`
        );
      } catch (error: any) {
        console.error(`Error syncing battles for user ${user.id}:`, error);
        userResult.success = false;
        userResult.error = error.message || 'Unknown error';
        usersFailed++;
      }

      results.push(userResult);
    }

    const response: CronSyncResponse = {
      success: true,
      totalUsers: users.length,
      usersWithPlayerTag: usersWithPlayerTag.length,
      usersProcessed: usersWithPlayerTag.length,
      usersSucceeded,
      usersFailed,
      results,
      errors: [],
    };

    console.log(
      `Daily sync completed: ${usersSucceeded} succeeded, ${usersFailed} failed`
    );

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in cron sync:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync battles',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

