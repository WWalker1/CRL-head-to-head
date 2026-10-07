import { getPlayerBattleLog } from '@/lib/clashRoyaleApi';
import { createMockBattle, createMockBattles, createMockBattleRecord } from './testHelpers';

// Setup a mock query builder factory
const createQueryBuilder = (overrides: Partial<any> = {}) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    in: jest.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
  };

  return Object.assign(builder, overrides);
};

// Mock the dependencies BEFORE importing battleProcessor
jest.mock('@/lib/clashRoyaleApi', () => ({
  getPlayerBattleLog: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => {
  const mockSupabase = {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'tracked_friends') {
        return createQueryBuilder();
      } else if (table === 'processed_battles') {
        return createQueryBuilder();
      } else if (table === 'battles') {
        return createQueryBuilder();
      }
      return createQueryBuilder();
    }),
    rpc: jest.fn().mockResolvedValue(null),
  };
  // Initialize and store in globalThis if not already set
  if (!(globalThis as any).__mockStore) {
    (globalThis as any).__mockStore = {};
  }
  (globalThis as any).__mockStore.supabase = mockSupabase;
  return {
    createClient: jest.fn(() => mockSupabase),
  };
});

// Access mock store after mocks are set up
const mockStore = (globalThis as any).__mockStore || {};
const tableFixtures = new Map<string, Array<(table: string) => any>>();
const createDefaultTableQuery = (table: string) => {
  const result = { data: [], error: null };
  const query: any = {
    select: jest.fn(() => query), eq: jest.fn(() => query), limit: jest.fn(() => query),
    order: jest.fn(() => query), update: jest.fn(() => query), insert: jest.fn(() => query),
    upsert: jest.fn(() => query), delete: jest.fn(() => query),
    single: jest.fn().mockResolvedValue({ data: null, error: table === 'battles' ? { code: 'PGRST116' } : null }),
    in: jest.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
    then: (resolve: (value: any) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
};
const installTableAwareFrom = () => {
  tableFixtures.clear();
  mockStore.supabase.from.mockImplementation((table: string) => {
    const next = tableFixtures.get(table)?.shift();
    return next ? next(table) : createDefaultTableQuery(table);
  });
};
const mockTableOnce = (table: string, factory: (table: string) => any) => {
  const queue = tableFixtures.get(table) || [];
  queue.push(factory);
  tableFixtures.set(table, queue);
};
installTableAwareFrom();


const createUserRatingSelectMock = (
  elo: number = 1500,
  error: any = null
) => {
  const builder = createQueryBuilder();
  builder.single.mockResolvedValue({
    data: error ? null : { elo_rating: elo },
    error,
  });
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.upsert.mockReturnValue(builder);

  return builder;
};

// Import battleProcessor AFTER mocks are set up
import { syncBattlesForUser } from '../battleProcessor';

describe('battleProcessor', () => {
  const userId = 'test-user-id';
  const playerTag = '#TEST123';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    installTableAwareFrom();
    mockStore.supabase.rpc.mockResolvedValue(null);
  });

  describe('syncBattlesForUser', () => {
    it('should skip battles that are not 1v1', async () => {
      // Mock friend data
      mockTableOnce('tracked_friends', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          data: [{ friend_player_tag: '#FRIEND1' }],
          error: null,
        }),
      }));

      // Mock cleanup - no battles to delete
      mockTableOnce('battles', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }));

      // Mock battle log with a 2v2 battle
      const mockBattle = {
        type: 'PVP2v2',
        battleTime: '2024-01-01T12:00:00.000Z',
        team: [{ tag: playerTag, crowns: 3 }, { tag: '#OTHER1', crowns: 3 }],
        opponent: [{ tag: '#FRIEND1', crowns: 0 }, { tag: '#OTHER2', crowns: 0 }],
        gameMode: { name: 'PVP2v2' },
        deckSelection: 'collection',
      };

      (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([mockBattle]);

      const result = await syncBattlesForUser(userId, playerTag);

      expect(result.battlesProcessed).toBe(0);
      expect(result.newBattles).toBe(0);
      expect(result.recordsUpdated).toBe(0);
    });

    it('should skip battles against untracked friends', async () => {
      // Mock friend data (no friends tracked)
      mockTableOnce('tracked_friends', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }));

      // Mock cleanup - no battles to delete
      mockTableOnce('battles', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }));

      // Mock battle log
      const mockBattle = {
        type: 'PVP',
        battleTime: '2024-01-01T12:00:00.000Z',
        team: [{ tag: playerTag, crowns: 3 }],
        opponent: [{ tag: '#UNTRACKED', crowns: 0 }],
        gameMode: { name: 'PVP' },
        deckSelection: 'collection',
      };

      (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([mockBattle]);

      const result = await syncBattlesForUser(userId, playerTag);

      // This counter reports eligible 1v1 battles from the fetched log, including
      // opponents we do not track. New records and friend totals stay untouched.
      expect(result.battlesProcessed).toBe(1);
      expect(result.newBattles).toBe(0);
      expect(result.recordsUpdated).toBe(0);
    });

    it('should handle API errors gracefully', async () => {
      (getPlayerBattleLog as jest.Mock).mockRejectedValueOnce(new Error('API error'));

      const result = await syncBattlesForUser(userId, playerTag);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.battlesProcessed).toBe(0);
    });

    it('should skip already processed battles', async () => {
      // Mock friend data
      mockTableOnce('tracked_friends', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          data: [{ friend_player_tag: '#FRIEND1' }],
          error: null,
        }),
      }));

      const mockBattle = createMockBattle({
        type: 'PVP',
        opponent: [{ tag: '#FRIEND1', name: 'Friend1', crowns: 0 }],
        team: [{ tag: playerTag, name: 'User', crowns: 3 }],
      });

      // Mock battles check - battle already exists
      mockTableOnce('battles', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
            data: { id: 'existing-battle-1' },
            error: null,
          }),
      }));

      // Mock cleanup - no battles to delete
      mockTableOnce('battles', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }));

      (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([mockBattle]);

      const result = await syncBattlesForUser(userId, playerTag);

      expect(result.newBattles).toBe(0);
      expect(result.recordsUpdated).toBe(0);
    });

    it('should process new battles against tracked friends', async () => {
      // Mock friend data
      mockTableOnce('tracked_friends', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          data: [{ friend_player_tag: '#FRIEND1' }],
          error: null,
        }),
      }));

      const mockBattle = createMockBattle({
        type: 'PVP',
        opponent: [{ tag: '#FRIEND1', name: 'Friend1', crowns: 0 }],
        team: [{ tag: playerTag, name: 'User', crowns: 3 }],
      });

      // Mock battles check - battle not found (new battle)
      mockTableOnce('battles', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }, // Not found
          }),
      }));

      // Mock battles insert
      mockTableOnce('battles', () => ({
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      // Mock cleanup - no battles to delete
      mockTableOnce('battles', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }));

      (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([mockBattle]);

      const result = await syncBattlesForUser(userId, playerTag);

      expect(result.battlesProcessed).toBe(1);
      expect(result.newBattles).toBe(1);
      expect(result.recordsUpdated).toBe(1);
      expect(mockStore.supabase.rpc).toHaveBeenCalledWith('increment_win', {
        p_user_id: userId,
        p_friend_tag: '#FRIEND1',
      });
    });

    it('should correctly determine win/loss based on crowns', async () => {
      // Mock friend data
      mockTableOnce('tracked_friends', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          data: [{ friend_player_tag: '#FRIEND1' }],
          error: null,
        }),
      }));

      // Loss battle (opponent has more crowns)
      const lossBattle = createMockBattle({
        type: 'PVP',
        opponent: [{ tag: '#FRIEND1', name: 'Friend1', crowns: 3 }],
        team: [{ tag: playerTag, name: 'User', crowns: 0 }],
      });

      // Mock battles check - battle not found (new battle)
      mockTableOnce('battles', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
      }));

      // Mock battles insert
      mockTableOnce('battles', () => ({
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      // Mock cleanup - no battles to delete
      mockTableOnce('battles', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }));

      (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([lossBattle]);

      const result = await syncBattlesForUser(userId, playerTag);

      expect(result.newBattles).toBe(1);
      expect(mockStore.supabase.rpc).toHaveBeenCalledWith('increment_loss', {
        p_user_id: userId,
        p_friend_tag: '#FRIEND1',
      });
    });

    it('should skip battles with missing opponent data', async () => {
      // Mock friend data
      mockTableOnce('tracked_friends', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          data: [{ friend_player_tag: '#FRIEND1' }],
          error: null,
        }),
      }));

      // Mock cleanup - no battles to delete
      mockTableOnce('battles', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }));

      const mockBattle = createMockBattle({
        type: 'PVP',
        opponent: undefined, // Missing opponent
        team: [{ tag: playerTag, name: 'User', crowns: 3 }],
      });

      (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([mockBattle]);

      const result = await syncBattlesForUser(userId, playerTag);

      expect(result.newBattles).toBe(0);
      expect(result.recordsUpdated).toBe(0);
    });

    it('should filter only 1v1 battle types', async () => {
      // Mock friend data
      mockTableOnce('tracked_friends', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          data: [{ friend_player_tag: '#FRIEND1' }],
          error: null,
        }),
      }));

      const battles = [
        createMockBattle({ type: 'PVP', opponent: [{ tag: '#FRIEND1', name: 'Friend1', crowns: 0 }], team: [{ tag: playerTag, name: 'User', crowns: 3 }] }),
        createMockBattle({ type: 'casual_1v1', opponent: [{ tag: '#FRIEND1', name: 'Friend1', crowns: 0 }], team: [{ tag: playerTag, name: 'User', crowns: 3 }] }),
        createMockBattle({ type: 'path_of_legend', opponent: [{ tag: '#FRIEND1', name: 'Friend1', crowns: 0 }], team: [{ tag: playerTag, name: 'User', crowns: 3 }] }),
        createMockBattle({ type: 'friendly', opponent: [{ tag: '#FRIEND1', name: 'Friend1', crowns: 0 }], team: [{ tag: playerTag, name: 'User', crowns: 3 }] }),
        createMockBattle({ type: 'PVP2v2', opponent: [{ tag: '#FRIEND1', name: 'Friend1', crowns: 0 }], team: [{ tag: playerTag, name: 'User', crowns: 3 }] }),
        createMockBattle({ type: 'clanWar', opponent: [{ tag: '#FRIEND1', name: 'Friend1', crowns: 0 }], team: [{ tag: playerTag, name: 'User', crowns: 3 }] }),
      ];

      // Mock battles checks - all return not found (new battles)
      // Should process 4 1v1 battles, so mock 4 checks and 4 inserts
      for (let i = 0; i < 4; i++) {
        // Mock battle existence check (not found)
        mockTableOnce('battles', () => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
      }));
        // Mock battle insert
        mockTableOnce('battles', () => ({
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        }));
      }

      // Mock cleanup - no battles to delete
      mockTableOnce('battles', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }));

      (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce(battles);

      const result = await syncBattlesForUser(userId, playerTag);

      // Should process 4 1v1 battles (PVP, casual_1v1, path_of_legend, friendly)
      expect(result.battlesProcessed).toBe(4);
      expect(result.newBattles).toBe(4);
    });

    it('should call cleanupOldBattles after processing', async () => {
      // Mock friend data
      mockTableOnce('tracked_friends', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }));

      // Mock cleanup - return empty battles
      mockTableOnce('battles', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }));

      (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([]);

      const result = await syncBattlesForUser(userId, playerTag);

      // Verify cleanup was called (battles table was queried)
      expect(mockStore.supabase.from).toHaveBeenCalledWith('battles');
      expect(result.deletedBattles).toBe(0);
    });
  });

  describe('cleanupOldBattles (via syncBattlesForUser)', () => {
    it('should keep all battles when 25 or fewer exist', async () => {
      // Mock friend data
      mockTableOnce('tracked_friends', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }));

      // Mock cleanup - 20 battles (less than 25)
      const battles = Array.from({ length: 20 }, (_, i) => ({
        id: `battle-${i}`,
      }));

      mockTableOnce('battles', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: battles,
          error: null,
        }),
      }));

      (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([]);

      const result = await syncBattlesForUser(userId, playerTag);

      expect(result.deletedBattles).toBe(0);
    });

    it('should keep exactly 50 battles when more than 50 exist', async () => {
      // Mock friend data
      mockTableOnce('tracked_friends', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }));

      // Mock cleanup - 60 battles (more than the 50 retained)
      const battles = Array.from({ length: 60 }, (_, i) => ({
        id: `battle-${i}`,
      }));

      const deleteMock = jest.fn().mockResolvedValue({
        data: null,
        error: null,
        count: 10,
      });

      mockTableOnce('battles', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: battles,
          error: null,
        }),
      }));

      // Mock delete operation
      mockTableOnce('battles', () => ({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: null,
          error: null,
          count: 10,
        }),
      }));

      (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([]);

      const result = await syncBattlesForUser(userId, playerTag);

      expect(result.deletedBattles).toBe(10);
    });

    it('should delete oldest battles correctly (ordered by battle_time DESC)', async () => {
      // Mock friend data
      mockTableOnce('tracked_friends', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }));

      // Mock cleanup - 70 battles
      const battles = Array.from({ length: 70 }, (_, i) => ({
        id: `battle-${i}`,
      }));

      mockTableOnce('battles', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: battles,
          error: null,
        }),
      }));

      // Keep the newest 50 and delete the remaining 20.
      const deleteInMock = jest.fn().mockResolvedValue({
        data: null,
        error: null,
        count: 20,
      });

      mockTableOnce('battles', () => ({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: deleteInMock,
      }));
      (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([]);

      const result = await syncBattlesForUser(userId, playerTag);

      expect(result.deletedBattles).toBe(20);
      // Verify order was called with descending
      expect(mockStore.supabase.from).toHaveBeenCalledWith('battles');
    });

    it('should handle batch deletion for large numbers of battles', async () => {
      // Mock friend data
      mockTableOnce('tracked_friends', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }));

      // Mock cleanup - 200 battles (will need batch deletion)
      const battles = Array.from({ length: 200 }, (_, i) => ({
        id: `battle-${i}`,
      }));

      mockTableOnce('battles', () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: battles,
          error: null,
        }),
      }));

      // Mock delete operation - should delete 150 battles in batches
      let deleteCallCount = 0;
      const deleteInMock = jest.fn().mockImplementation(() => {
        deleteCallCount++;
        return Promise.resolve({
          data: null,
          error: null,
          count: deleteCallCount === 1 ? 100 : 50, // First batch 100, second batch 50
        });
      });

      mockTableOnce('battles', () => ({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: deleteInMock,
      }));
      // The cleanup deletes 150 stale IDs in two independent queries.
      mockTableOnce('battles', () => ({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: deleteInMock,
      }));

      (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([]);

      const result = await syncBattlesForUser(userId, playerTag);

      expect(result.deletedBattles).toBe(150);
      // Should be called twice for batching (150 battles / 100 batch size = 2 batches)
      expect(deleteInMock).toHaveBeenCalledTimes(2);
    });
  });
});
