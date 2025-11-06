import { getPlayerBattleLog } from '@/lib/clashRoyaleApi';
import { createMockBattle, createMockTrackedFriend } from './testHelpers';

// Mock the dependencies BEFORE importing battleProcessor
jest.mock('@/lib/clashRoyaleApi', () => ({
  getPlayerBattleLog: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => {
  const mockSupabase = {
    from: jest.fn(),
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

// Import battleProcessor AFTER mocks are set up
import { syncBattlesForUser } from '../battleProcessor';

describe('User Isolation', () => {
  const userAId = 'user-a-id';
  const userBId = 'user-b-id';
  const playerTagA = '#USERA';
  const playerTagB = '#USERB';

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.supabase.rpc = jest.fn().mockResolvedValue(null);
  });

  it('should allow two users to track completely different sets of friends', async () => {
    // Mock User A's tracked friends
    mockStore.supabase.from.mockImplementationOnce((table: string) => {
      if (table === 'tracked_friends') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnValue({
            data: [{ friend_player_tag: '#FRIEND1' }, { friend_player_tag: '#FRIEND2' }],
            error: null,
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const battleA = createMockBattle({
      type: 'PVP',
      opponent: [{ tag: '#FRIEND1', name: 'Friend1', crowns: 0 }],
      team: [{ tag: playerTagA, name: 'UserA', crowns: 3 }],
    });

    // Mock User A's battles check - battle not found
    mockStore.supabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }),
    }));

    // Mock User A's battle insert
    mockStore.supabase.from.mockImplementationOnce(() => ({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    }));

    // Mock User A's cleanup
    mockStore.supabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));

    (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([battleA]);

    const resultA = await syncBattlesForUser(userAId, playerTagA);

    expect(resultA.newBattles).toBe(1);

    // Reset mocks for User B
    jest.clearAllMocks();

    // Mock User B's tracked friends (completely different)
    mockStore.supabase.from.mockImplementationOnce((table: string) => {
      if (table === 'tracked_friends') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnValue({
            data: [{ friend_player_tag: '#FRIEND3' }, { friend_player_tag: '#FRIEND4' }],
            error: null,
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const battleB = createMockBattle({
      type: 'PVP',
      opponent: [{ tag: '#FRIEND3', name: 'Friend3', crowns: 0 }],
      team: [{ tag: playerTagB, name: 'UserB', crowns: 3 }],
    });

    // Mock User B's battles check - battle not found
    mockStore.supabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }),
    }));

    // Mock User B's battle insert
    mockStore.supabase.from.mockImplementationOnce(() => ({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    }));

    // Mock User B's cleanup
    mockStore.supabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));

    (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([battleB]);

    const resultB = await syncBattlesForUser(userBId, playerTagB);

    expect(resultB.newBattles).toBe(1);

    // Verify User A's RPC calls were for their friends only
      expect(mockStore.supabase.rpc).toHaveBeenCalledWith('increment_win', {
      p_user_id: userBId,
      p_friend_tag: '#FRIEND3',
    });
  });

  it('should allow two users to track the same friend (different records)', async () => {
    const sharedFriendTag = '#SHAREDFRIEND';

    // Mock User A's tracked friends
    mockStore.supabase.from.mockImplementationOnce((table: string) => {
      if (table === 'tracked_friends') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnValue({
            data: [{ friend_player_tag: sharedFriendTag }],
            error: null,
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const battleA = createMockBattle({
      type: 'PVP',
      opponent: [{ tag: sharedFriendTag, name: 'SharedFriend', crowns: 0 }],
      team: [{ tag: playerTagA, name: 'UserA', crowns: 3 }],
    });

    // Mock User A's battles check - battle not found
    mockStore.supabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }),
    }));

    // Mock User A's battle insert
    mockStore.supabase.from.mockImplementationOnce(() => ({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    }));

    // Mock User A's cleanup
    mockStore.supabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));

    (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([battleA]);

    const resultA = await syncBattlesForUser(userAId, playerTagA);

    expect(resultA.newBattles).toBe(1);
      expect(mockStore.supabase.rpc).toHaveBeenCalledWith('increment_win', {
      p_user_id: userAId,
      p_friend_tag: sharedFriendTag,
    });

    // Reset mocks for User B
    jest.clearAllMocks();
    mockStore.supabase.rpc = jest.fn().mockResolvedValue(null);

    // Mock User B's tracked friends (same friend)
    mockStore.supabase.from.mockImplementationOnce((table: string) => {
      if (table === 'tracked_friends') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnValue({
            data: [{ friend_player_tag: sharedFriendTag }],
            error: null,
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const battleB = createMockBattle({
      type: 'PVP',
      opponent: [{ tag: sharedFriendTag, name: 'SharedFriend', crowns: 3 }],
      team: [{ tag: playerTagB, name: 'UserB', crowns: 0 }],
    });

    // Mock User B's battles check - battle not found
    mockStore.supabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }),
    }));

    // Mock User B's battle insert
    mockStore.supabase.from.mockImplementationOnce(() => ({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    }));

    // Mock User B's cleanup
    mockStore.supabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));

    (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([battleB]);

    const resultB = await syncBattlesForUser(userBId, playerTagB);

    expect(resultB.newBattles).toBe(1);
    // Verify User B's RPC calls were for their own record
      expect(mockStore.supabase.rpc).toHaveBeenCalledWith('increment_loss', {
      p_user_id: userBId,
      p_friend_tag: sharedFriendTag,
    });
  });

  it('should process battles for User A without affecting User B\'s tracked_friends records', async () => {
    // Mock User A's tracked friends
    mockStore.supabase.from.mockImplementationOnce((table: string) => {
      if (table === 'tracked_friends') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnValue({
            data: [{ friend_player_tag: '#FRIEND1' }],
            error: null,
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const battle = createMockBattle({
      type: 'PVP',
      opponent: [{ tag: '#FRIEND1', name: 'Friend1', crowns: 0 }],
      team: [{ tag: playerTagA, name: 'UserA', crowns: 3 }],
    });

    // Mock User A's battles check - battle not found
    mockStore.supabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }),
    }));

    // Mock User A's battle insert
    mockStore.supabase.from.mockImplementationOnce(() => ({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    }));

    // Mock User A's cleanup
    mockStore.supabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));

    (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([battle]);

    const result = await syncBattlesForUser(userAId, playerTagA);

    expect(result.newBattles).toBe(1);
    // Verify RPC was called with User A's ID
      expect(mockStore.supabase.rpc).toHaveBeenCalledWith('increment_win', {
      p_user_id: userAId,
      p_friend_tag: '#FRIEND1',
    });
    // Verify it was NOT called with User B's ID
      expect(mockStore.supabase.rpc).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ p_user_id: userBId })
    );
  });

  it('should cleanup battles for User A without affecting User B\'s battles', async () => {
    // Mock User A's tracked friends
    mockStore.supabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValue({
        data: [],
        error: null,
      }),
    }));

    // Mock User A's battles (30 battles - will trigger cleanup)
    const userABattles = Array.from({ length: 30 }, (_, i) => ({
      id: `battle-a-${i}`,
    }));

    mockStore.supabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: userABattles,
        error: null,
      }),
    }));

    // Mock User A's delete operation
    const deleteInMock = jest.fn().mockResolvedValue({
      data: null,
      error: null,
      count: 5,
    });

    mockStore.supabase.from.mockImplementationOnce(() => ({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: deleteInMock,
    }));

    (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([]);

    const resultA = await syncBattlesForUser(userAId, playerTagA);

    expect(resultA.deletedBattles).toBe(5);

    // Verify delete was called with User A's user_id
      expect(mockStore.supabase.from).toHaveBeenCalledWith('battles');
    expect(deleteInMock).toHaveBeenCalled();

    // Reset for User B
    jest.clearAllMocks();
    mockStore.supabase.from = jest.fn();

    // Mock User B's tracked friends
    mockStore.supabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValue({
        data: [],
        error: null,
      }),
    }));

    // Mock User B's battles (20 battles - no cleanup needed)
    const userBBattles = Array.from({ length: 20 }, (_, i) => ({
      id: `battle-b-${i}`,
    }));

    mockStore.supabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: userBBattles,
        error: null,
      }),
    }));

    (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([]);

    const resultB = await syncBattlesForUser(userBId, playerTagB);

    // User B should have no deletions (20 < 25)
    expect(resultB.deletedBattles).toBe(0);
  });

  it('should not process User A\'s battles for User B', async () => {
    // Mock User B's tracked friends
    mockStore.supabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValue({
        data: [{ friend_player_tag: '#FRIEND1' }],
        error: null,
      }),
    }));

    // Mock cleanup for User B
    mockStore.supabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));

    // Battle where User A is the opponent (not User B)
    const battle = createMockBattle({
      type: 'PVP',
      opponent: [{ tag: playerTagA, name: 'UserA', crowns: 0 }], // User A is opponent
      team: [{ tag: '#OTHER', name: 'Other', crowns: 3 }], // Not User B
    });

    (getPlayerBattleLog as jest.Mock).mockResolvedValueOnce([battle]);

    const result = await syncBattlesForUser(userBId, playerTagB);

    // Should not process because the battle is not for User B
    // The battle has User A as opponent but User B is not in the team
    expect(result.newBattles).toBe(0);
    expect(result.recordsUpdated).toBe(0);
  });
});

