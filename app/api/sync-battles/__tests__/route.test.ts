/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

// Mock the dependencies BEFORE importing the route
jest.mock('@supabase/supabase-js', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
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

jest.mock('@/utils/battleProcessor', () => ({
  syncBattlesForUser: jest.fn(),
}));

// Import route AFTER mocks are set up
import { POST } from '../route';
import { syncBattlesForUser } from '@/utils/battleProcessor';

describe('Sync Battles Route', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock request
    mockRequest = {
      headers: new Headers(),
    } as NextRequest;
  });

  describe('Authentication', () => {
    it('should require authorization header', async () => {
      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockStore.supabase.auth.getUser).not.toHaveBeenCalled();
    });

    it('should return unauthorized for invalid token', async () => {
      mockRequest.headers.set('authorization', 'Bearer invalid-token');

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
        user_metadata: { player_tag: '#USER1' },
      };

      mockRequest.headers.set('authorization', 'Bearer valid-token');

      mockStore.supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (syncBattlesForUser as jest.Mock).mockResolvedValue({
        battlesProcessed: 5,
        recordsUpdated: 3,
        newBattles: 2,
        deletedBattles: 0,
        errors: [],
      });

      await POST(mockRequest);

      expect(mockStore.supabase.auth.getUser).toHaveBeenCalledWith('valid-token');
    });
  });

  describe('Player Tag', () => {
    beforeEach(() => {
      mockRequest.headers.set('authorization', 'Bearer valid-token');
    });

    it('should use player_tag from user metadata', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        user_metadata: { player_tag: '#USER1' },
      };

      mockStore.supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (syncBattlesForUser as jest.Mock).mockResolvedValue({
        battlesProcessed: 5,
        recordsUpdated: 3,
        newBattles: 2,
        deletedBattles: 0,
        errors: [],
      });

      await POST(mockRequest);

      expect(syncBattlesForUser).toHaveBeenCalledWith('user-id', '#USER1');
    });

    it('should handle missing player_tag gracefully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        user_metadata: {}, // No player_tag
      };

      mockStore.supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Player tag not found');
      expect(syncBattlesForUser).not.toHaveBeenCalled();
    });

    it('should handle undefined player_tag', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        user_metadata: { player_tag: undefined },
      };

      mockStore.supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Player tag not found');
    });
  });

  describe('Battle Synchronization', () => {
    beforeEach(() => {
      mockRequest.headers.set('authorization', 'Bearer valid-token');
    });

    it('should call syncBattlesForUser with correct parameters', async () => {
      const userId = 'user-id';
      const playerTag = '#USER1';
      const mockUser = {
        id: userId,
        email: 'user@test.com',
        user_metadata: { player_tag: playerTag },
      };

      mockStore.supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const syncResult = {
        battlesProcessed: 5,
        recordsUpdated: 3,
        newBattles: 2,
        deletedBattles: 1,
        errors: [],
      };

      (syncBattlesForUser as jest.Mock).mockResolvedValue(syncResult);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(syncBattlesForUser).toHaveBeenCalledWith(userId, playerTag);
      expect(data).toEqual(syncResult);
    });

    it('should return sync result', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        user_metadata: { player_tag: '#USER1' },
      };

      mockStore.supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const syncResult = {
        battlesProcessed: 10,
        recordsUpdated: 5,
        newBattles: 3,
        deletedBattles: 2,
        errors: ['Error 1', 'Error 2'],
      };

      (syncBattlesForUser as jest.Mock).mockResolvedValue(syncResult);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.battlesProcessed).toBe(10);
      expect(data.recordsUpdated).toBe(5);
      expect(data.newBattles).toBe(3);
      expect(data.deletedBattles).toBe(2);
      expect(data.errors).toEqual(['Error 1', 'Error 2']);
    });

    it('should handle sync errors gracefully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        user_metadata: { player_tag: '#USER1' },
      };

      mockStore.supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (syncBattlesForUser as jest.Mock).mockRejectedValue(new Error('Sync failed'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to sync battles');
      expect(data.details).toBe('Sync failed');
    });

    it('should handle general errors', async () => {
      mockStore.supabase.auth.getUser.mockRejectedValue(new Error('Unexpected error'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to sync battles');
    });
  });

  describe('Response Structure', () => {
    beforeEach(() => {
      mockRequest.headers.set('authorization', 'Bearer valid-token');

      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        user_metadata: { player_tag: '#USER1' },
      };

      mockStore.supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it('should return correct sync result structure', async () => {
      const syncResult = {
        battlesProcessed: 5,
        recordsUpdated: 3,
        newBattles: 2,
        deletedBattles: 1,
        errors: [],
      };

      (syncBattlesForUser as jest.Mock).mockResolvedValue(syncResult);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('battlesProcessed');
      expect(data).toHaveProperty('recordsUpdated');
      expect(data).toHaveProperty('newBattles');
      expect(data).toHaveProperty('deletedBattles');
      expect(data).toHaveProperty('errors');
    });
  });
});

