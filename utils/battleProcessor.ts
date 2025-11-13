import { ClashRoyaleBattle } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';
import { getPlayerBattleLog } from '@/lib/clashRoyaleApi';

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

async function getUserRatingData(userId: string, playerTag?: string): Promise<UserRatingData> {
  const { data, error } = await supabase
    .from('user_ratings')
    .select('elo_rating, player_tag, num_ranked_games, updated_at')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  // if the player already has an elo just return what they cur have
  if (data) {
    // Update player_tag if it's missing or different
    if (playerTag && data.player_tag !== playerTag) {
      await supabase
        .from('user_ratings')
        .update({ player_tag: playerTag })
        .eq('user_id', userId);
    }
    return {
      elo_rating: data.elo_rating ?? DEFAULT_ELO,
      num_ranked_games: data.num_ranked_games ?? 0,
      updated_at: data.updated_at,
    };
  }

  const { data: upsertData, error: upsertError } = await supabase
    .from('user_ratings')
    .upsert({ 
      user_id: userId, 
      elo_rating: DEFAULT_ELO,
      player_tag: playerTag || null,
      num_ranked_games: 0,
    }, { onConflict: 'user_id' })
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
    // Get all battles for the user, ordered by battle_time DESC (most recent first)
    const { data: allBattles, error: fetchError } = await supabase
      .from('battles')
      .select('id')
      .eq('user_id', userId)
      .order('battle_time', { ascending: false });

    if (fetchError) {
      console.error('Error fetching battles for cleanup:', fetchError);
      return 0;
    }

    // If we have 25 or fewer battles, no cleanup needed
    if (!allBattles || allBattles.length <= 25) {
      return 0;
    }

    // Get the IDs of the 25 most recent battles to keep
    const battlesToKeep = allBattles.slice(0, 25).map(b => b.id);
    const battlesToKeepSet = new Set(battlesToKeep);

    // Get all battle IDs to delete (those not in the top 25)
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
    // Get tracked friends
    const { data: friends, error: friendsError } = await supabase
      .from('tracked_friends')
      .select('friend_player_tag, elo_rating')
      .eq('user_id', userId);

    if (friendsError) {
      result.errors.push('Failed to fetch tracked friends');
      return result;
    }

    const trackedTags = new Set(friends?.map(f => f.friend_player_tag) || []);
    const friendRatings = new Map<string, number>();
    friends?.forEach(friend => {
      friendRatings.set(friend.friend_player_tag, friend.elo_rating ?? DEFAULT_ELO);
    });

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
        (battleType === 'PvP' || 
         battleType === 'casual_1v1' || 
         battleType === 'path_of_legend' || 
         battleType === 'trail' || 
         battleType === 'friendly') ||
         battleType === 'clanMate' && 
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

        // Check if battle already exists (prevents duplicates via unique constraint)
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

        // Store battle record for current user (unique constraint prevents duplicates)
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
            continue; // Battle was already inserted, skip
          }
          throw insertError; // Re-throw other errors
        }

        // Update current user's friend record
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

        result.newBattles++;
        result.recordsUpdated++;

        // Calculate days since last battle for current user
        // Use battle time, not current time, to calculate how long since their last battle
        const battleTime = new Date(battle.battleTime).getTime();
        const daysSinceLastBattle = userRatingData.updated_at
          ? Math.floor((battleTime - new Date(userRatingData.updated_at).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        // Get opponent's rating from tracked_friends (current user's view)
        const opponentRating = friendRatings.get(opponent.tag) ?? DEFAULT_ELO;

        // Check if opponent has an account
        const { data: opponentUserRating } = await supabase
          .from('user_ratings')
          .select('user_id')
          .eq('player_tag', opponent.tag)
          .single();

        // Calculate Elo change for current user
        const newUserRating = calculateEloChange(
          userRating, 
          opponentRating, 
          isWin ? 1 : 0,
          userNumRankedGames,
          daysSinceLastBattle
        );

        // Update current user's rating and increment game count
        const { error: userRatingUpdateError } = await supabase
          .from('user_ratings')
          .update({ 
            elo_rating: newUserRating,
            player_tag: playerTag,
            num_ranked_games: userNumRankedGames + 1
          })
          .eq('user_id', userId)
          .select('elo_rating, num_ranked_games')
          .single();

        if (userRatingUpdateError) {
          console.error('Error updating user rating:', userRatingUpdateError);
          result.errors.push('Failed to update player rating');
        } else {
          userRating = newUserRating;
          userNumRankedGames = userNumRankedGames + 1;
          // Update updated_at for next battle calculation (use battle time, not current time)
          userRatingData.updated_at = battle.battleTime;
        }

        // Update tracked_friends record with new rating
        const newFriendRating = calculateEloChange(
          opponentRating, 
          userRating, 
          isWin ? 0 : 1,
          0, // We don't track opponent's game count in tracked_friends
          0  // We don't track opponent's recency in tracked_friends
        );

        const { error: friendRatingUpdateError } = await supabase
          .from('tracked_friends')
          .update({ elo_rating: newFriendRating })
          .eq('user_id', userId)
          .eq('friend_player_tag', opponent.tag)
          .select('elo_rating')
          .single();

        if (friendRatingUpdateError) {
          console.error('Error updating friend rating:', friendRatingUpdateError);
          result.errors.push(`Failed to update rating for ${opponent.tag}`);
        } else {
          friendRatings.set(opponent.tag, newFriendRating);
        }

        // If opponent has an account, update their Elo rating too
        if (opponentUserRating) {
          // Get opponent's rating data
          const { data: oppData } = await supabase
            .from('user_ratings')
            .select('elo_rating, num_ranked_games, updated_at')
            .eq('user_id', opponentUserRating.user_id)
            .single();

          if (oppData) {
            const opponentRatingData: UserRatingData = {
              elo_rating: oppData.elo_rating ?? DEFAULT_ELO,
              num_ranked_games: oppData.num_ranked_games ?? 0,
              updated_at: oppData.updated_at,
            };

            const opponentDaysSinceLastBattle = opponentRatingData.updated_at
              ? Math.floor((battleTime - new Date(opponentRatingData.updated_at).getTime()) / (1000 * 60 * 60 * 24))
              : 0;

            // Calculate Elo change for opponent
            const newOpponentRating = calculateEloChange(
              opponentRatingData.elo_rating,
              userRating,
              isWin ? 0 : 1,
              opponentRatingData.num_ranked_games,
              opponentDaysSinceLastBattle
            );

            // Insert battle into opponent's battles table
            await supabase
              .from('battles')
              .insert({
                user_id: opponentUserRating.user_id,
                battle_time: battle.battleTime,
                battle_type: battle.type,
                opponent_tag: playerTag,
                result: isWin ? 'loss' : 'win', // Opposite result from opponent's perspective
              });

            // Update opponent's tracked_friends record
            if (isWin) {
              await supabase.rpc('increment_loss', {
                p_user_id: opponentUserRating.user_id,
                p_friend_tag: playerTag,
              });
            } else {
              await supabase.rpc('increment_win', {
                p_user_id: opponentUserRating.user_id,
                p_friend_tag: playerTag,
              });
            }

            // Update opponent's Elo rating
            const { error: opponentRatingUpdateError } = await supabase
              .from('user_ratings')
              .update({ 
                elo_rating: newOpponentRating,
                num_ranked_games: opponentRatingData.num_ranked_games + 1
              })
              .eq('user_id', opponentUserRating.user_id)
              .select('elo_rating, num_ranked_games')
              .single();

            if (opponentRatingUpdateError) {
              console.error('Error updating opponent rating:', opponentRatingUpdateError);
              result.errors.push(`Failed to update opponent rating for ${opponent.tag}`);
            }
          }
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

