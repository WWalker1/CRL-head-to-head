import { ClashRoyaleBattle } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';
import { getPlayerInfo, getPlayerBattleLog } from '@/lib/clashRoyaleApi';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
      console.error(`[DEBUG] User ${userId}: Error fetching battles for cleanup:`, fetchError);
      return 0;
    }

    // If we have 25 or fewer battles, no cleanup needed
    if (!allBattles || allBattles.length <= 50) {
      console.log(`[DEBUG] User ${userId}: No cleanup needed - ${allBattles?.length || 0} battles (keeping last 25)`);
      return 0;
    }
    
    console.log(`[DEBUG] User ${userId}: Found ${allBattles.length} battles, will keep 25 and delete ${allBattles.length - 25}`);

    // Get the IDs of the 25 most recent battles to keep
    const battlesToKeep = allBattles.slice(0, 50).map(b => b.id);
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

    console.log(`[DEBUG] User ${userId}: Cleanup complete - deleted ${deletedCount} old battles`);
    return deletedCount;
  } catch (err: any) {
    console.error(`[DEBUG] User ${userId}: Error in cleanupOldBattles:`, err);
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
    console.log(`[DEBUG] User ${userId} (${playerTag}): Fetched ${battles.length} total battles from API`);
    
    // Get tracked friends
    const { data: friends, error: friendsError } = await supabase
      .from('tracked_friends')
      .select('friend_player_tag')
      .eq('user_id', userId);

    if (friendsError) {
      result.errors.push('Failed to fetch tracked friends');
      return result;
    }

    const trackedTags = new Set(friends?.map(f => f.friend_player_tag) || []);
    console.log(`[DEBUG] User ${userId} (${playerTag}): Tracking ${trackedTags.size} friends:`, Array.from(trackedTags));

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
    console.log(`[DEBUG] User ${userId} (${playerTag}): Filtered to ${oneVoneBattles.length} 1v1 battles`);

    // Process each battle
    for (const battle of oneVoneBattles) {
      try {
        // Determine opponent tag
        const opponent = battle.opponent?.[0];
        if (!opponent) {
          console.log(`[DEBUG] User ${userId} (${playerTag}): Skipping battle ${battle.battleTime} - no opponent data`);
          continue; // Skip battles without opponent data
        }

        // Check if opponent is a tracked friend
        if (!trackedTags.has(opponent.tag)) {
          console.log(`[DEBUG] User ${userId} (${playerTag}): Skipping battle ${battle.battleTime} vs ${opponent.tag} - not a tracked friend`);
          continue; // Not tracking this player
        }

        console.log(`[DEBUG] User ${userId} (${playerTag}): Processing battle ${battle.battleTime} vs ${opponent.tag} (type: ${battle.type})`);

        // Check if battle already exists (prevents duplicates via unique constraint)
        const { data: existingBattle } = await supabase
          .from('battles')
          .select('id')
          .eq('user_id', userId)
          .eq('battle_time', battle.battleTime)
          .eq('battle_type', battle.type)
          .single();

        if (existingBattle) {
          console.log(`[DEBUG] User ${userId} (${playerTag}): Skipping battle ${battle.battleTime} vs ${opponent.tag} - already exists in DB (id: ${existingBattle.id})`);
          continue; // Skip already processed battles
        }

        // Determine win/loss based on team crowns
        const userCrowns = battle.team?.[0]?.crowns || 0;
        const opponentCrowns = opponent.crowns || 0;
        const isWin = userCrowns > opponentCrowns;

        console.log(`[DEBUG] User ${userId} (${playerTag}): Inserting battle ${battle.battleTime} vs ${opponent.tag} - Result: ${isWin ? 'WIN' : 'LOSS'} (${userCrowns}-${opponentCrowns})`);

        // Store battle record (unique constraint prevents duplicates)
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
            console.log(`[DEBUG] User ${userId} (${playerTag}): Battle ${battle.battleTime} vs ${opponent.tag} - insert failed (unique constraint violation - already exists)`);
            continue; // Battle was already inserted, skip
          }
          console.error(`[DEBUG] User ${userId} (${playerTag}): Battle ${battle.battleTime} vs ${opponent.tag} - insert error:`, insertError);
          throw insertError; // Re-throw other errors
        }

        console.log(`[DEBUG] User ${userId} (${playerTag}): Successfully inserted battle ${battle.battleTime} vs ${opponent.tag}`);

        // Update friend record
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
        console.log(`[DEBUG] User ${userId} (${playerTag}): Updated friend record for ${opponent.tag} - New battles: ${result.newBattles}, Records updated: ${result.recordsUpdated}`);
      } catch (err: any) {
        result.errors.push(`Failed to process battle: ${err.message}`);
      }
    }

    result.battlesProcessed = oneVoneBattles.length;

    // Cleanup old battles, keeping only the last 25
    result.deletedBattles = await cleanupOldBattles(userId);
    
    console.log(`[DEBUG] User ${userId} (${playerTag}): Sync complete - Processed: ${result.battlesProcessed}, New: ${result.newBattles}, Updated: ${result.recordsUpdated}, Deleted: ${result.deletedBattles}, Errors: ${result.errors.length}`);
  } catch (err: any) {
    console.error(`[DEBUG] User ${userId} (${playerTag}): Sync failed with error:`, err);
    result.errors.push(`Failed to sync battles: ${err.message}`);
  }

  return result;
}