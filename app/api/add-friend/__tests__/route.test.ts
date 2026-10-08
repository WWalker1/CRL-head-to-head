/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { getPlayerInfo } from '@/lib/clashRoyaleApi';
import { createMockPlayer } from '@/utils/__tests__/testHelpers';

// Mock the dependencies BEFORE importing the route
jest.mock('@supabase/supabase-js', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
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

jest.mock('@/lib/clashRoyaleApi', () => ({
  getPlayerInfo: jest.fn(),
}));

// Import route AFTER mocks are set up
import { POST } from '../route';

describe('Add Friend Route', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock request
    mockRequest = {
      headers: new Headers(),
      json: jest.fn(),
    } as any;
  });

  describe('Authentication', () => {
    it('should require authorization header', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendTag: '#FRIEND1' });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockStore.supabase.auth.getUser).not.toHaveBeenCalled();
    });

    it('should return unauthorized for invalid token', async () => {
      mockRequest.headers.set('authorization', 'Bearer invalid-token');
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendTag: '#FRIEND1' });

      mockStore.supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should accept valid authorization token', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        user_metadata: {},
      };

      mockRequest.headers.set('authorization', 'Bearer valid-token');
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendTag: '#FRIEND1' });

      mockStore.supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockPlayer = createMockPlayer({ tag: '#FRIEND1', name: 'Friend1' });
      (getPlayerInfo as jest.Mock).mockResolvedValue(mockPlayer);

      mockStore.supabase.from.mockReturnValue({
        then: (resolve: any) => Promise.resolve({ count: 0, error: null }).then(resolve),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // Not found
        }),
        insert: jest.fn().mockReturnThis(),
      });

      await POST(mockRequest);

      expect(mockStore.supabase.auth.getUser).toHaveBeenCalledWith('valid-token');
    });
  });

  describe('Friend Validation', () => {
    beforeEach(() => {
      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        user_metadata: {},
      };

      mockRequest.headers.set('authorization', 'Bearer valid-token');
      mockStore.supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it('should require friendTag in request body', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({});

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Friend tag is required');
    });

    it('should validate friend tag exists in Clash Royale API', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendTag: '#INVALID' });

      (getPlayerInfo as jest.Mock).mockRejectedValue(
        new Error('Clash Royale API error: 404 - Not found')
      );

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid player tag');
      expect(getPlayerInfo).toHaveBeenCalledWith('#INVALID');
    });

    it('should use validated friend tag from API response', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendTag: '#FRIEND1' });

      const mockPlayer = createMockPlayer({ tag: '#FRIEND1', name: 'Friend1' });
      (getPlayerInfo as jest.Mock).mockResolvedValue(mockPlayer);

      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn()
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        })
        .mockResolvedValueOnce({
          data: { id: 'friend-1', friend_player_tag: '#FRIEND1' },
          error: null,
        });

      mockStore.supabase.from.mockReturnValue({
        then: (resolve: any) => Promise.resolve({ count: 0, error: null }).then(resolve),
        select: selectMock,
        eq: eqMock,
        single: singleMock,
        insert: jest.fn().mockReturnThis(),
      });

      await POST(mockRequest);

      expect(getPlayerInfo).toHaveBeenCalledWith('#FRIEND1');
    });
  });

  describe('Friend Tracking', () => {
    beforeEach(() => {
      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        user_metadata: {},
      };

      mockRequest.headers.set('authorization', 'Bearer valid-token');
      mockStore.supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockPlayer = createMockPlayer({ tag: '#FRIEND1', name: 'Friend1' });
      (getPlayerInfo as jest.Mock).mockResolvedValue(mockPlayer);
    });

    it('enforces the 15-friend limit for the authenticated user before calling the game API', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendTag: '#FRIEND1' });
      const query: any = { select: jest.fn(() => query), eq: jest.fn(() => query), then: (resolve: any) => Promise.resolve({ count: 15, error: null }).then(resolve), insert: jest.fn() };
      mockStore.supabase.from.mockReturnValue(query);

      const response = await POST(mockRequest);
      expect(response.status).toBe(409);
      expect((await response.json()).error).toMatch(/up to 15 friends/);
      expect(query.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
      expect(query.eq).toHaveBeenCalledWith('user_id', 'user-id');
      expect(getPlayerInfo).not.toHaveBeenCalled();
      expect(query.insert).not.toHaveBeenCalled();
    });

    it('fails closed when the authenticated friend count is unavailable', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendTag: '#FRIEND1' });
      const query: any = { select: jest.fn(() => query), eq: jest.fn(() => query), then: (resolve: any) => Promise.resolve({ count: null, error: { message: 'unavailable' } }).then(resolve) };
      mockStore.supabase.from.mockReturnValue(query);

      const response = await POST(mockRequest);
      expect(response.status).toBe(503);
      expect(getPlayerInfo).not.toHaveBeenCalled();
    });

    it('should prevent duplicate friend tracking', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendTag: '#FRIEND1' });

      mockStore.supabase.from.mockReturnValue({
        then: (resolve: any) => Promise.resolve({ count: 0, error: null }).then(resolve),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'existing-friend' },
          error: null,
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Already tracking this friend');
    });

    it('should create tracked_friend record with correct user_id', async () => {
      const userId = 'user-id';
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendTag: '#FRIEND1' });

      const insertSelectMock = jest.fn().mockReturnThis();
      const insertSingleMock = jest.fn().mockResolvedValue({
        data: {
          id: 'friend-1',
          user_id: userId,
          friend_player_tag: '#FRIEND1',
          friend_name: 'Friend1',
        },
        error: null,
      });

      const insertMock = jest.fn().mockReturnValue({
        select: insertSelectMock,
      });

      insertSelectMock.mockReturnValue({
        single: insertSingleMock,
      });

      mockStore.supabase.from.mockReturnValue({
        then: (resolve: any) => Promise.resolve({ count: 0, error: null }).then(resolve),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
        insert: insertMock,
        upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user_id).toBe(userId);
      expect(data.friend_player_tag).toBe('#FRIEND1');
      expect(insertMock).toHaveBeenCalled();
    });

    it('should handle database errors when inserting friend', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendTag: '#FRIEND1' });

      const insertSelectMock = jest.fn().mockReturnThis();
      const insertSingleMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      insertSelectMock.mockReturnValue({
        single: insertSingleMock,
      });

      const insertMock = jest.fn().mockReturnValue({
        select: insertSelectMock,
      });

      mockStore.supabase.from.mockReturnValue({
        then: (resolve: any) => Promise.resolve({ count: 0, error: null }).then(resolve),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
        insert: insertMock,
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to add friend');
    });

    it('reports the database limit when a concurrent insert wins first', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendTag: '#FRIEND1' });
      const chain: any = {
        then: (resolve: any) => Promise.resolve({ count: 14, error: null }).then(resolve),
        select: jest.fn(() => chain), eq: jest.fn(() => chain),
        single: jest.fn()
          .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
          .mockResolvedValueOnce({ data: null, error: { code: '23514', message: 'Tracked friend limit reached' } }),
        insert: jest.fn(() => chain),
      };
      mockStore.supabase.from.mockReturnValue(chain);

      const response = await POST(mockRequest);
      expect(response.status).toBe(409);
      expect((await response.json()).error).toMatch(/up to 15 friends/);
      expect(chain.insert).toHaveBeenCalledTimes(1);
    });

    it('should return appropriate error for general failures', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendTag: '#FRIEND1' });

      mockStore.supabase.from.mockReturnValue({
        then: (resolve: any) => Promise.resolve({ count: 0, error: null }).then(resolve),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Unexpected error')),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to add friend');
    });
  });
});
