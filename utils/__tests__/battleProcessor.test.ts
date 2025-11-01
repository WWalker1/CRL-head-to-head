import { syncBattlesForUser } from '../battleProcessor';
import { getPlayerBattleLog } from '@/lib/clashRoyaleApi';
import { createClient } from '@supabase/supabase-js';

// Mock the dependencies
jest.mock('@/lib/clashRoyaleApi');
jest.mock('@supabase/supabase-js');

describe('battleProcessor', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup a mock query builder
    const createQueryBuilder = () => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      single: jest.fn(),
    });

    // Mock Supabase client
    mockSupabase = {
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

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('syncBattlesForUser', () => {
    const userId = 'test-user-id';
    const playerTag = '#TEST123';

    it('should skip battles that are not 1v1', async () => {
      // Mock friend data
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          data: [{ friend_player_tag: '#FRIEND1' }],
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
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
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

      expect(result.battlesProcessed).toBe(0);
      expect(result.newBattles).toBe(0);
      expect(result.recordsUpdated).toBe(0);
    });

    it('should handle API errors gracefully', async () => {
      (getPlayerBattleLog as jest.Mock).mockRejectedValueOnce(new Error('API error'));

      const result = await syncBattlesForUser(userId, playerTag);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.battlesProcessed).toBe(0);
    });

  });
});
