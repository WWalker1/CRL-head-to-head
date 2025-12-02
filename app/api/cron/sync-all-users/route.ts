import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncBattlesForUser } from '@/utils/battleProcessor';

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
    // Log all headers for debugging
    const allHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });
    console.log('[ALL HEADERS]', JSON.stringify(allHeaders, null, 2));

    // Verify request is from Vercel Cron
    // Vercel sends x-vercel-cron header with value "1" for cron jobs
    // OR we can check User-Agent: vercel-cron/1.0 as fallback
    const cronHeader = request.headers.get('x-vercel-cron') || request.headers.get('X-Vercel-Cron');
    const userAgent = request.headers.get('user-agent') || request.headers.get('User-Agent') || '';
    const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
    const expectedSecret = process.env.CRON_SECRET;

    // Check multiple ways Vercel might identify cron jobs
    // User-Agent contains 'vercel-cron' is a reliable indicator
    const isVercelCron = cronHeader === '1' || userAgent.includes('vercel-cron');
    const isValidSecret = expectedSecret && cronSecret === expectedSecret;

    console.log('[CRON AUTH]', {
      hasCronHeader: !!cronHeader,
      cronHeaderValue: cronHeader,
      userAgent,
      isVercelCron,
      hasCronSecret: !!cronSecret,
      hasExpectedSecret: !!expectedSecret,
      isValidSecret,
    });

    if (!isVercelCron && !isValidSecret) {
      console.error('[CRON AUTH] Unauthorized - missing valid auth');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CRON AUTH] Authorization passed, starting sync...');
    
    // Create Supabase client with service role key inside the function
    // to ensure env vars are available and client is fresh
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('[SUPABASE CLIENT]', {
      hasUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      serviceRoleKeyLength: serviceRoleKey?.length || 0,
      serviceRoleKeyPrefix: serviceRoleKey?.substring(0, 10) || 'missing',
    });

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[SUPABASE CLIENT] Missing required environment variables');
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Create client with service role key for admin operations
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch all users from Supabase Auth with pagination
    // listUsers() defaults to 50 users per page, so we need to paginate to get all users
    console.log('[SUPABASE] Attempting to list users (with pagination)...');
    const perPage = 1000; // Max per page (Supabase allows up to 1000)
    
    // First, fetch page 1 to determine total number of pages needed
    const firstPageResult = await supabase.auth.admin.listUsers({
      page: 1,
      perPage,
    });

    if (firstPageResult.error) {
      console.error('[SUPABASE ERROR] Failed to fetch users:', {
        message: firstPageResult.error.message,
        status: firstPageResult.error.status,
        name: firstPageResult.error.name,
        fullError: JSON.stringify(firstPageResult.error, null, 2),
      });
      return NextResponse.json(
        { error: 'Failed to fetch users', details: firstPageResult.error.message },
        { status: 500 }
      );
    }

    if (!firstPageResult.data?.users || firstPageResult.data.users.length === 0) {
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

    const firstPageUsers = firstPageResult.data.users;
    const totalUsersFromFirstPage = firstPageUsers.length;
    
    // If first page is full, we need to fetch more pages
    // Estimate total pages: if first page has 1000 users, there might be more
    // We'll fetch pages in parallel batches for better performance
    let allUsers = [...firstPageUsers];
    const fetchStartTime = Date.now();
    
    if (totalUsersFromFirstPage === perPage) {
      // First page is full, likely more pages exist
      // Fetch pages 2-10 in parallel first to see how many total pages we need
      const initialParallelPages = 10;
      const pagePromises: Promise<any>[] = [];
      
      for (let page = 2; page <= initialParallelPages; page++) {
        pagePromises.push(
          supabase.auth.admin.listUsers({ page, perPage })
            .then(result => ({ page, result }))
        );
      }
      
      const pageResults = await Promise.all(pagePromises);
      
      for (const { page, result } of pageResults) {
        if (result.error) {
          console.error(`[SUPABASE ERROR] Failed to fetch page ${page}:`, result.error.message);
          // Continue with other pages even if one fails
          continue;
        }
        
        if (result.data?.users && result.data.users.length > 0) {
          allUsers = allUsers.concat(result.data.users);
          console.log(`[SUPABASE] Fetched page ${page}: ${result.data.users.length} users (total so far: ${allUsers.length})`);
          
          // If this page is not full, we've reached the end
          if (result.data.users.length < perPage) {
            break;
          }
        }
      }
      
      // If we got full pages, continue fetching sequentially (to avoid overwhelming the API)
      // This handles cases where there are more than 10 pages
      let currentPage = initialParallelPages + 1;
      while (allUsers.length % perPage === 0 && allUsers.length > 0) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
          page: currentPage,
          perPage,
        });
        
        if (error) {
          console.error(`[SUPABASE ERROR] Failed to fetch page ${currentPage}:`, error.message);
          break;
        }
        
        if (!users || users.length === 0) {
          break;
        }
        
        allUsers = allUsers.concat(users);
        console.log(`[SUPABASE] Fetched page ${currentPage}: ${users.length} users (total so far: ${allUsers.length})`);
        
        if (users.length < perPage) {
          break;
        }
        
        currentPage++;
      }
    }

    const fetchTime = Date.now() - fetchStartTime;
    console.log(`[SUPABASE] Total users fetched: ${allUsers.length} in ${(fetchTime / 1000).toFixed(2)}s`);
    
    const users = allUsers;

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

    console.log(`[SUPABASE] Total users fetched: ${users.length}`);

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

    // Helper function to check if error is a 429 rate limit error
    const isRateLimitError = (error: any): boolean => {
      const errorMessage = error?.message || '';
      return errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('Too Many Requests');
    };

    // Helper function to sync a single user with retry on 429
    const syncUserWithRetry = async (userId: string, playerTag: string): Promise<UserSyncResult> => {
      const userResult: UserSyncResult = {
        userId,
        playerTag,
        success: false,
      };

      try {
        const syncResult = await syncBattlesForUser(userId, playerTag);
        userResult.success = true;
        userResult.result = syncResult;
        return userResult;
      } catch (error: any) {
        // If it's a 429 error, wait 0.25s and retry once
        if (isRateLimitError(error)) {
          console.log(`Rate limit (429) encountered for user ${userId}, waiting 0.25s and retrying...`);
          await new Promise(resolve => setTimeout(resolve, 250)); // Wait 0.25 seconds
          
          try {
            const syncResult = await syncBattlesForUser(userId, playerTag);
            userResult.success = true;
            userResult.result = syncResult;
            console.log(`Retry succeeded for user ${userId}`);
            return userResult;
          } catch (retryError: any) {
            console.error(`Retry failed for user ${userId}:`, retryError);
            userResult.error = retryError.message || 'Unknown error';
            return userResult;
          }
        } else {
          // Non-429 error, just return the error
          userResult.error = error.message || 'Unknown error';
          return userResult;
        }
      }
    };

    // Batch processing: 15 users per batch, 0.5s between batches, 4.5 minute timeout
    const BATCH_SIZE = 15;
    const BATCH_INTERVAL_MS = 500; // 0.5 seconds
    const MAX_DURATION_MS = 270000; // 4.5 minutes (270 seconds)
    
    const startTime = Date.now();
    let batchCount = 0;
    let usersProcessed = 0;

    console.log(`Starting async batch processing: ${usersWithPlayerTag.length} users to process`);

    // Process users in batches - batches can overlap if they take longer than 0.5s
    let lastBatchStartTime: number | null = null;
    const batchPromises: Array<Promise<UserSyncResult[]>> = [];
    
    for (let i = 0; i < usersWithPlayerTag.length; i += BATCH_SIZE) {
      // Check if we've exceeded the time limit
      const elapsed = Date.now() - startTime;
      if (elapsed >= MAX_DURATION_MS) {
        console.log(`Time limit reached (${elapsed}ms elapsed), stopping batch processing`);
        break;
      }

      // If this isn't the first batch, ensure at least BATCH_INTERVAL_MS has passed since last batch started
      if (lastBatchStartTime !== null) {
        const timeSinceLastBatchStart = Date.now() - lastBatchStartTime;
        if (timeSinceLastBatchStart < BATCH_INTERVAL_MS) {
          const waitTime = BATCH_INTERVAL_MS - timeSinceLastBatchStart;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      const batch = usersWithPlayerTag.slice(i, i + BATCH_SIZE);
      batchCount++;
      
      const batchStartTime = Date.now();
      lastBatchStartTime = batchStartTime;
      console.log(`\n=== Starting batch ${batchCount} at ${((Date.now() - startTime) / 1000).toFixed(2)}s (${batch.length} users) ===`);

      // Process batch concurrently - don't await, allow batches to overlap
      const batchPromise = Promise.all(
        batch.map(async (user) => {
          const playerTag = user.user_metadata.player_tag;
          const result = await syncUserWithRetry(user.id, playerTag);
          
          // Set email and playerTag if not already set
          if (!result.email) result.email = user.email;
          if (!result.playerTag) result.playerTag = playerTag;
          
          if (result.success) {
            usersSucceeded++;
            console.log(
              `✓ Successfully synced for user ${user.id}: ${result.result?.newBattles || 0} new battles`
            );
          } else {
            usersFailed++;
            console.error(`✗ Failed to sync user ${user.id}: ${result.error}`);
          }
          
          return result;
        })
      ).then((batchResults) => {
        const batchElapsed = Date.now() - batchStartTime;
        console.log(`Batch ${batchCount} completed in ${batchElapsed}ms`);
        return batchResults;
      });

      batchPromises.push(batchPromise);
      usersProcessed += batch.length;
    }

    // Wait for all batches to complete
    console.log(`\nWaiting for ${batchPromises.length} batches to complete...`);
    const allBatchResults = await Promise.all(batchPromises);
    
    // Flatten results from all batches
    for (const batchResults of allBatchResults) {
      results.push(...batchResults);
    }

    const totalElapsed = Date.now() - startTime;
    console.log(`\n=== Batch Processing Complete ===`);
    console.log(`Total time: ${(totalElapsed / 1000).toFixed(2)} seconds`);
    console.log(`Batches processed: ${batchCount}`);
    console.log(`Users processed: ${usersProcessed} of ${usersWithPlayerTag.length}`);
    console.log(`Users succeeded: ${usersSucceeded}`);
    console.log(`Users failed: ${usersFailed}`);

    const response: CronSyncResponse = {
      success: true,
      totalUsers: users.length,
      usersWithPlayerTag: usersWithPlayerTag.length,
      usersProcessed: usersProcessed, // Report actual count processed (may be less than total if time limit reached)
      usersSucceeded,
      usersFailed,
      results,
      errors: [],
    };

    console.log(
      `Daily sync completed: ${usersProcessed} processed, ${usersSucceeded} succeeded, ${usersFailed} failed`
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
