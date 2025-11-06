import { ClashRoyaleBattle, ClashRoyalePlayer } from '@/lib/types';

/**
 * Creates a mock Clash Royale battle
 */
export function createMockBattle(
  overrides?: Partial<ClashRoyaleBattle>
): ClashRoyaleBattle {
  const now = new Date();
  const battleTime = new Date(now.getTime() - Math.random() * 10000000000);
  
  return {
    type: 'PVP',
    battleTime: battleTime.toISOString(),
    gameMode: { id: 72000002, name: 'PvP' },
    arena: { id: 54000000, name: 'Arena 1' },
    opponent: [{ tag: '#FRIEND1', name: 'Friend1', crowns: 0 }],
    team: [{ tag: '#USER1', name: 'User1', crowns: 3 }],
    deckSelection: 'collection',
    isLadderTournament: false,
    isHostedMatch: false,
    ...overrides,
  };
}

/**
 * Creates multiple mock battles with different timestamps
 */
export function createMockBattles(count: number, baseTime?: Date): ClashRoyaleBattle[] {
  const battles: ClashRoyaleBattle[] = [];
  const startTime = baseTime || new Date();
  
  for (let i = 0; i < count; i++) {
    const battleTime = new Date(startTime.getTime() - i * 60000); // 1 minute apart
    battles.push(createMockBattle({
      battleTime: battleTime.toISOString(),
    }));
  }
  
  return battles;
}

/**
 * Creates a mock Clash Royale player
 */
export function createMockPlayer(
  overrides?: Partial<ClashRoyalePlayer>
): ClashRoyalePlayer {
  return {
    tag: '#USER1',
    name: 'TestUser',
    expLevel: 10,
    trophies: 5000,
    arena: { name: 'Arena 10' },
    bestTrophies: 5200,
    wins: 100,
    losses: 50,
    battleCount: 150,
    threeCrownWins: 30,
    ...overrides,
  };
}

/**
 * Creates a mock tracked friend record
 */
export function createMockTrackedFriend(
  userId: string,
  friendTag: string,
  overrides?: Partial<{
    id: string;
    friend_name: string;
    total_wins: number;
    total_losses: number;
  }>
) {
  return {
    id: overrides?.id || `friend-${friendTag}`,
    user_id: userId,
    friend_player_tag: friendTag,
    friend_name: overrides?.friend_name || `Friend ${friendTag}`,
    total_wins: overrides?.total_wins || 0,
    total_losses: overrides?.total_losses || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Creates a mock battle record
 */
export function createMockBattleRecord(
  userId: string,
  battleTime: string,
  opponentTag: string,
  result: 'win' | 'loss',
  overrides?: Partial<{
    id: string;
    battle_type: string;
    processed: boolean;
  }>
) {
  return {
    id: overrides?.id || `battle-${Date.now()}-${Math.random()}`,
    user_id: userId,
    battle_time: battleTime,
    battle_type: overrides?.battle_type || 'PVP',
    opponent_tag: opponentTag,
    result,
    processed: overrides?.processed !== undefined ? overrides.processed : true,
    created_at: new Date().toISOString(),
  };
}

/**
 * Creates a mock Supabase user
 */
export function createMockUser(
  userId: string,
  email: string,
  playerTag?: string
) {
  return {
    id: userId,
    email,
    user_metadata: playerTag ? { player_tag: playerTag } : {},
    created_at: new Date().toISOString(),
  };
}

/**
 * Creates a mock Supabase query builder chain
 */
export function createMockQueryBuilder(mockData: any = null, mockError: any = null) {
  const builder = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ data: mockData, error: mockError }),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: mockData, error: mockError }),
    in: jest.fn().mockResolvedValue({ data: mockData, error: mockError, count: 0 }),
  };
  
  // Chain methods return this
  builder.select.mockReturnValue(builder);
  builder.from.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.delete.mockReturnValue(builder);
  
  return builder;
}

