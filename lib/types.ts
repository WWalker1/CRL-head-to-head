export interface TrackedFriend {
  id: string;
  user_id: string;
  friend_player_tag: string;
  friend_name: string;
  total_wins: number;
  total_losses: number;
  created_at: string;
  updated_at: string;
}

export interface Battle {
  id: string;
  user_id: string;
  battle_time: string;
  battle_type: string;
  opponent_tag: string;
  result: 'win' | 'loss';
  processed: boolean;
  created_at: string;
}

export interface ClashRoyalePlayer {
  tag: string;
  name: string;
  expLevel: number;
  trophies: number;
  arena: {
    name: string;
  };
  bestTrophies: number;
  wins: number;
  losses: number;
  battleCount: number;
  threeCrownWins: number;
}

export interface ClashRoyaleBattle {
  type: string;
  battleTime: string;
  gameMode?: {
    id: number;
    name: string;
  };
  arena?: {
    id: number;
    name: string;
  };
  opponent?: Array<{
    tag: string;
    name: string;
    crowns: number;
  }>;
  team?: Array<{
    tag: string;
    name: string;
    crowns: number;
  }>;
  deckSelection: string;
  isLadderTournament: boolean;
  isHostedMatch: boolean;
}

export interface BattleResult {
  battlesProcessed: number;
  recordsUpdated: number;
  newBattles: number;
}

