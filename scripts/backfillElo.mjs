#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_ELO = 1500;
const K_FACTOR = Number.isFinite(Number(process.env.ELO_K_FACTOR))
  ? Number(process.env.ELO_K_FACTOR)
  : 32;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function calculateExpectedScore(playerRating, opponentRating) {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

function calculateEloChange(playerRating, opponentRating, score) {
  const expected = calculateExpectedScore(playerRating, opponentRating);
  return Math.round(playerRating + K_FACTOR * (score - expected));
}

async function fetchDistinctUserIds() {
  const { data, error } = await supabase
    .from('tracked_friends')
    .select('user_id', { distinct: true });

  if (error) {
    throw new Error(`Failed to fetch user ids: ${error.message}`);
  }

  return (data || []).map(row => row.user_id);
}

async function backfillForUser(userId) {
  const { data: friendRows, error: friendsError } = await supabase
    .from('tracked_friends')
    .select('id, friend_player_tag')
    .eq('user_id', userId);

  if (friendsError) {
    throw new Error(`Failed to fetch friends for ${userId}: ${friendsError.message}`);
  }

  if (!friendRows || friendRows.length === 0) {
    return;
  }

  const friendRatings = new Map();
  for (const friend of friendRows) {
    friendRatings.set(friend.friend_player_tag, {
      id: friend.id,
      rating: DEFAULT_ELO,
    });
  }

  let userRating = DEFAULT_ELO;

  // Fetch battles with pagination to handle users with many battles
  // Process battles in chronological order for accurate Elo calculation
  let allBattles = [];
  let page = 0;
  const pageSize = 1000; // Supabase default limit is 1000
  
  while (true) {
    const { data: battles, error: battlesError } = await supabase
      .from('battles')
      .select('battle_time, opponent_tag, result')
      .eq('user_id', userId)
      .order('battle_time', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (battlesError) {
      throw new Error(`Failed to fetch battles for ${userId}: ${battlesError.message}`);
    }
    
    if (!battles || battles.length === 0) {
      break; // No more battles
    }
    
    allBattles = allBattles.concat(battles);
    
    // If we got fewer than pageSize, we've reached the end
    if (battles.length < pageSize) {
      break;
    }
    
    page++;
  }
  
  const battles = allBattles;

  if (battlesError) {
    throw new Error(`Failed to fetch battles for ${userId}: ${battlesError.message}`);
  }

  for (const battle of battles || []) {
    const friend = friendRatings.get(battle.opponent_tag);
    if (!friend) {
      continue;
    }

    const isWin = battle.result === 'win';
    const updatedUserRating = calculateEloChange(userRating, friend.rating, isWin ? 1 : 0);
    const updatedFriendRating = calculateEloChange(friend.rating, userRating, isWin ? 0 : 1);

    userRating = updatedUserRating;
    friend.rating = updatedFriendRating;
  }

  const friendUpdates = Array.from(friendRatings.values()).map(friend => ({
    id: friend.id,
    elo_rating: friend.rating,
  }));

  const { error: friendUpdateError } = await supabase
    .from('tracked_friends')
    .upsert(friendUpdates, { onConflict: 'id' });

  if (friendUpdateError) {
    throw new Error(`Failed to update friend ratings for ${userId}: ${friendUpdateError.message}`);
  }

  const { error: userRatingError } = await supabase
    .from('user_ratings')
    .upsert(
      {
        user_id: userId,
        elo_rating: userRating,
      },
      { onConflict: 'user_id' }
    );

  if (userRatingError) {
    throw new Error(`Failed to update user rating for ${userId}: ${userRatingError.message}`);
  }
}

async function main() {
  console.log('Starting Elo backfill...');
  const userIds = await fetchDistinctUserIds();

  for (const [index, userId] of userIds.entries()) {
    console.log(`Processing user ${index + 1}/${userIds.length}: ${userId}`);
    await backfillForUser(userId);
  }

  console.log('Elo backfill completed successfully.');
}

main().catch(err => {
  console.error('Elo backfill failed:', err);
  process.exit(1);
});

