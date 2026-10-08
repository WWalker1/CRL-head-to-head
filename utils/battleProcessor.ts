import { ClashRoyaleBattle } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';
import { getPlayerBattleLog } from '@/lib/clashRoyaleApi';
import { captureUserHistory } from '@/lib/history-storage';

const DEFAULT_ELO = 1500;
const K_FACTOR = Number(process.env.ELO_K_FACTOR ?? 32);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// simple win probability calculation
function calculateExpectedScore(playerRating: number, opponentRating: number) {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

// uses time since last battle, num ranked battles played, and exp_res to calculate ELO change
function calculateEloChange(
  playerRating: number, 
  opponentRating: number, 
  score: 0 | 1,
  numRankedGames: number = 0,
  daysSinceLastBattle: number = 0
) {
  const expected = calculateExpectedScore(playerRating, opponentRating);
  
  // Adjust K-factor based on experience and recency
  // New players (fewer games) get higher K-factor for faster convergence
  // Players who haven't played in a while get higher K-factor to reflect skill changes
  let adjustedKFactor = K_FACTOR;
  
  // Reduce K-factor as player gains experience (more games = more stable rating)
  // After 30 games, use standard K-factor
  if (numRankedGames < 30) {
    // New players: K-factor starts high and decreases
    // 0 games: 2x K-factor, 30 games: 1x K-factor
    const experienceMultiplier = 2 - (numRankedGames / 30);
    adjustedKFactor = K_FACTOR * experienceMultiplier;
  }
  
  // Increase K-factor if player hasn't played in a while
  // More than 30 days = 1.5x multiplier, more than 90 days = 2x multiplier
  if (daysSinceLastBattle > 0) {
    if (daysSinceLastBattle > 90) {
      adjustedKFactor *= 2.0;
    } else if (daysSinceLastBattle > 30) {
      // Linear interpolation between 30 and 90 days
      const recencyMultiplier = 1.5 + (0.5 * (daysSinceLastBattle - 30) / 60);
      adjustedKFactor *= recencyMultiplier;
    } else if (daysSinceLastBattle > 7) {
      // Small boost for 7-30 days
      const recencyMultiplier = 1.0 + (0.5 * (daysSinceLastBattle - 7) / 23);
      adjustedKFactor *= recencyMultiplier;
    }
  }
  
  return Math.round(playerRating + adjustedKFactor * (score - expected));
}

interface UserRatingData {
  elo_rating: number;
  num_ranked_games: number;
  updated_at: string | null;
}

// Ratings belong to accounts; selecting a public game tag grants no ownership.
async function getUserRatingData(userId: string, playerTag?: string): Promise<UserRatingData> {
  // First, check if this user already has a rating entry
  const { data: existingUserData, error: userError } = await supabase
    .from('user_ratings')
    .select('elo_rating, player_tag, num_ranked_games, updated_at')
    .eq('user_id', userId)
    .single();

  if (userError && userError.code !== 'PGRST116') {
    throw userError;
  }

  // If user has existing entry, return it (update player_tag if needed)
  if (existingUserData) {
    if (playerTag && existingUserData.player_tag !== playerTag) {
      await supabase
        .from('user_ratings')
        .update({ player_tag: playerTag })
        .eq('user_id', userId);
    }
    return {
      elo_rating: existingUserData.elo_rating ?? DEFAULT_ELO,
      num_ranked_games: existingUserData.num_ranked_games ?? 0,
      updated_at: existingUserData.updated_at,
    };
  }

  // Initialize this account independently of other accounts with the same tag.
  const { data: upsertData, error: upsertError } = await supabase
    .from('user_ratings')
    .insert({ 
      user_id: userId, 
      elo_rating: DEFAULT_ELO,
      player_tag: playerTag || null,
      num_ranked_games: 0,
    })
    .select('elo_rating, num_ranked_games, updated_at')
    .single();

  if (upsertError) {
    throw upsertError;
  }

  return {
    elo_rating: upsertData?.elo_rating ?? DEFAULT_ELO,
    num_ranked_games: upsertData?.num_ranked_games ?? 0,
    updated_at: upsertData?.updated_at ?? null,
  };
}

export interface SyncResult {
  battlesProcessed: number;
  recordsUpdated: number;
  newBattles: number;
  deletedBattles: number;
  errors: string[];
}

/**
 * Cleanup old battles, keeping only the last 25 per user
 * This helps reduce storage costs by maintaining only recent battle history
 */
async function cleanupOldBattles(userId: string): Promise<number> {
  try {
    // We only need to keep the last 50 battles, so fetch a bit more to be safe
    // Using pagination to avoid fetching thousands of battles
    const KEEP_COUNT = 50;
    const FETCH_LIMIT = 200; // Fetch up to 200 to find what to delete
    
    // Get battles for the user, ordered by battle_time DESC (most recent first)
    // Limit to FETCH_LIMIT to avoid pagination issues with users who have thousands of battles
    const { data: allBattles, error: fetchError } = await supabase
      .from('battles')
      .select('id')
      .eq('user_id', userId)
      .order('battle_time', { ascending: false })
      .limit(FETCH_LIMIT);

    if (fetchError) {
      console.error('Error fetching battles for cleanup:', fetchError);
      return 0;
    }

    // If we have KEEP_COUNT or fewer battles, no cleanup needed
    if (!allBattles || allBattles.length <= KEEP_COUNT) {
      return 0;
    }

    // Get the IDs of the KEEP_COUNT most recent battles to keep
    const battlesToKeep = allBattles.slice(0, KEEP_COUNT).map(b => b.id);
    const battlesToKeepSet = new Set(battlesToKeep);

    // Get all battle IDs to delete (those not in the top KEEP_COUNT)
    const battlesToDelete = allBattles
      .filter(b => !battlesToKeepSet.has(b.id))
      .map(b => b.id);

    if (battlesToDelete.length === 0) {
      return 0;
    }

    // Delete battles in batches to avoid query size limits
    let deletedCount = 0;
    const batchSize = 100;
    for (let i = 0; i < battlesToDelete.length; i += batchSize) {
      const batch = battlesToDelete.slice(i, i + batchSize);
      const { error: deleteError, count } = await supabase
        .from('battles')
        .delete()
        .eq('user_id', userId)
        .in('id', batch);

      if (deleteError) {
        console.error('Error deleting old battles:', deleteError);
        continue;
      }

      deletedCount += count || 0;
    }

    return deletedCount;
  } catch (err: any) {
    console.error('Error in cleanupOldBattles:', err);
    return 0;
  }
}


// the code that does the stuff for all the things
export async function syncBattlesForUser(userId: string, playerTag: string): Promise<SyncResult> {
  const result: SyncResult = {
    battlesProcessed: 0,
    recordsUpdated: 0,
    newBattles: 0,
    deletedBattles: 0,
    errors: [],
  };

  try {
    // Get recent battles from API
    const battles = await getPlayerBattleLog(playerTag);

    // Get tracked friends (just for the tags, not for Elo ratings)
    const { data: friends, error: friendsError } = await supabase
      .from('tracked_friends')
      .select('id,friend_player_tag')
      .eq('user_id', userId);

    if (friendsError) {
      result.errors.push('Failed to fetch tracked friends');
      return result;
    }

    if (process.env.MATCH_HISTORY_ENABLED === '1') {
      result.errors.push(...await captureUserHistory(supabase, userId, playerTag, battles, friends || []));
    }

    const trackedTags = new Set(friends?.map(f => f.friend_player_tag) || []);

    // gets your own rating data
    let userRatingData: UserRatingData;
    try {
      userRatingData = await getUserRatingData(userId, playerTag);
    } catch (ratingError: any) {
      console.error('Error fetching user rating:', ratingError);
      result.errors.push('Failed to fetch player rating');
      return result;
    }
    
    let userRating = userRatingData.elo_rating;
    let userNumRankedGames = userRatingData.num_ranked_games;

    // Filter for 1v1 battles (casual, ranked ladder, friendly, or path of legends)
    const oneVoneBattles = battles.filter(battle => {
      const battleType = battle.type.toLowerCase(); // Convert to lowercase once
      
      return (
        (battleType === 'pvp' || 
         battleType === 'casual_1v1' || 
         battleType === 'path_of_legend' || 
         battleType === 'trail' || 
         battleType === 'friendly') ||
         battleType === 'clanmate' && 
        battle.team && 
        battle.team.length === 1
      );
    });

    // Process each battle
    for (const battle of oneVoneBattles) {
      try {
        // Determine opponent tag
        const opponent = battle.opponent?.[0];
        if (!opponent) {
          continue; // Skip battles without opponent data
        }

        // Check if opponent is a tracked friend
        if (!trackedTags.has(opponent.tag)) {
          continue; // Not tracking this player
        }

        // Check if battle already exists for this user_id (prevents duplicates)
        const { data: existingBattle } = await supabase
          .from('battles')
          .select('id')
          .eq('user_id', userId)
          .eq('battle_time', battle.battleTime)
          .eq('battle_type', battle.type)
          .single();

        if (existingBattle) {
          continue; // Skip already processed battles
        }

        // Determine win/loss based on team crowns
        const userCrowns = battle.team?.[0]?.crowns || 0;
        const opponentCrowns = opponent.crowns || 0;
        const isWin = userCrowns > opponentCrowns;

        // Store the battle independently for the authenticated account.
        const { error: insertError } = await supabase
          .from('battles')
          .insert({
            user_id: userId,
            battle_time: battle.battleTime,
            battle_type: battle.type,
            opponent_tag: opponent.tag,
            result: isWin ? 'win' : 'loss',
          });

        // If insert failed due to unique constraint, skip (race condition handled)
        if (insertError) {
          // Check if it's a unique constraint violation (code 23505)
          if (insertError.code === '23505') {
            continue; // Battle was already inserted for this user_id, skip
          }
          throw insertError; // Re-throw other errors
        }

        result.newBattles++;

        // Update current user's friend record (only if we're the first to process)
        if (isWin) {
          await supabase.rpc('increment_win', {
            p_user_id: userId,
            p_friend_tag: opponent.tag,
          });
        } else {
          await supabase.rpc('increment_loss', {
            p_user_id: userId,
            p_friend_tag: opponent.tag,
          });
        }

        result.recordsUpdated++;

        // Calculate days since last battle for current user
        // Use battle time, not current time, to calculate how long since their last battle
        const battleTime = new Date(battle.battleTime).getTime();
        const daysSinceLastBattle = userRatingData.updated_at
          ? Math.floor((battleTime - new Date(userRatingData.updated_at).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        // Check if opponent has an account and get their rating from user_ratings
        // Opponent ratings are read-only context; only this account is updated.
        const { data: opponentRatingData } = await supabase
          .from('user_ratings')
          .select('elo_rating, num_ranked_games, updated_at')
          .eq('player_tag', opponent.tag)
          .limit(1)
          .single();

        // Get opponent's rating from user_ratings (actual current rating, not cached in tracked_friends)
        const opponentRating = opponentRatingData?.elo_rating ?? DEFAULT_ELO;

        // Calculate Elo change for current user
        const newUserRating = calculateEloChange(
          userRating, 
          opponentRating, 
          isWin ? 1 : 0,
          userNumRankedGames,
          daysSinceLastBattle
        );

        // Game tags are unverified selections. Never authorize a write to a
        // different account using a tag, even when accounts select the same tag.
        const { error: ratingUpdateError } = await supabase
          .from('user_ratings')
          .update({ elo_rating: newUserRating, num_ranked_games: userNumRankedGames + 1 })
          .eq('user_id', userId);
        if (ratingUpdateError) {
          console.error('Error updating user rating:', ratingUpdateError);
          result.errors.push('Failed to update player rating');
        } else {
          userRating = newUserRating;
          userNumRankedGames += 1;
          userRatingData.updated_at = battle.battleTime;
        }
      } catch (err: any) {
        result.errors.push(`Failed to process battle: ${err.message}`);
      }
    }

    result.battlesProcessed = oneVoneBattles.length;

    // Cleanup old battles, keeping only the last 25
    result.deletedBattles = await cleanupOldBattles(userId);
  } catch (err: any) {
    result.errors.push(`Failed to sync battles: ${err.message}`);
  }

  return result;
}
