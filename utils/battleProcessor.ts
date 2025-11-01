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
  errors: string[];
}

export async function syncBattlesForUser(userId: string, playerTag: string): Promise<SyncResult> {
  const result: SyncResult = {
    battlesProcessed: 0,
    recordsUpdated: 0,
    newBattles: 0,
    errors: [],
  };

  try {
    // Get recent battles from API
    const battles = await getPlayerBattleLog(playerTag);

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

    // Filter for 1v1 battles (casual or ranked ladder)
    const oneVoneBattles = battles.filter(battle => 
      (battle.type === 'PVP' || battle.type === 'CASUAL_1V1' || battle.type === 'PATH_OF_LEGEND') &&
      battle.team && 
      battle.team.length === 1
    );

    // Process each battle
    for (const battle of oneVoneBattles) {
      try {
        // Generate unique battle ID from API
        const battleId = `${battle.battleTime}_${battle.type}`;

        // Check if already processed
        const { data: processed } = await supabase
          .from('processed_battles')
          .select('id')
          .eq('user_id', userId)
          .eq('battle_id', battleId)
          .single();

        if (processed) {
          continue; // Skip already processed battles
        }

        // Determine opponent tag
        const opponent = battle.opponent?.[0];
        if (!opponent) {
          continue; // Skip battles without opponent data
        }

        // Check if opponent is a tracked friend
        if (!trackedTags.has(opponent.tag)) {
          continue; // Not tracking this player
        }

        // Determine win/loss based on team crowns
        const userCrowns = battle.team?.[0]?.crowns || 0;
        const opponentCrowns = opponent.crowns || 0;
        const isWin = userCrowns > opponentCrowns;

        // Mark as processed first to prevent duplicates
        await supabase
          .from('processed_battles')
          .insert({
            user_id: userId,
            battle_id: battleId,
          });

        // Store battle record
        await supabase
          .from('battles')
          .insert({
            user_id: userId,
            battle_time: battle.battleTime,
            battle_type: battle.type,
            opponent_tag: opponent.tag,
            result: isWin ? 'win' : 'loss',
            processed: true,
          });

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
      } catch (err: any) {
        result.errors.push(`Failed to process battle: ${err.message}`);
      }
    }

    result.battlesProcessed = oneVoneBattles.length;
  } catch (err: any) {
    result.errors.push(`Failed to sync battles: ${err.message}`);
  }

  return result;
}

