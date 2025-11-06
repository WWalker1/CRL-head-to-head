/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { syncBattlesForUser } from '@/utils/battleProcessor';

// Mock the dependencies BEFORE importing the route
jest.mock('@supabase/supabase-js', () => {
  const mockAuth = {
    admin: {
      listUsers: jest.fn(),
    },
  };
  // Initialize and store in globalThis if not already set
  if (!(globalThis as any).__mockStore) {
    (globalThis as any).__mockStore = {};
  }
  (globalThis as any).__mockStore.auth = mockAuth;
  return {
    createClient: jest.fn(() => ({
      auth: mockAuth,
    })),
  };
});

// Access mock store after mocks are set up
const mockStore = (globalThis as any).__mockStore || {};

jest.mock('@/utils/battleProcessor', () => ({
  syncBattlesForUser: jest.fn(),
}));

// Import route AFTER mocks are set up
import { GET } from '../route';

describe('Cron Sync All Users Route', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock request
    mockRequest = {
      headers: new Headers(),
    } as NextRequest;
  });

  describe('Authentication', () => {
    it('should require x-vercel-cron header or CRON_SECRET', async () => {
      // No headers
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should accept x-vercel-cron header with value "1"', async () => {
      // Vercel sends x-vercel-cron with value "1"
      mockRequest.headers.set('x-vercel-cron', '1');

      mockStore.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      expect(mockStore.auth.admin.listUsers).toHaveBeenCalled();
    });

    it('should accept CRON_SECRET in authorization header', async () => {
      process.env.CRON_SECRET = 'test-secret';
      mockRequest.headers.set('authorization', 'Bearer test-secret');

      mockStore.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      expect(mockStore.auth.admin.listUsers).toHaveBeenCalled();

      delete process.env.CRON_SECRET;
    });

    it('should reject invalid CRON_SECRET', async () => {
      process.env.CRON_SECRET = 'test-secret';
      mockRequest.headers.set('authorization', 'Bearer wrong-secret');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');

      delete process.env.CRON_SECRET;
    });
  });

  describe('User Processing', () => {
    beforeEach(() => {
      mockRequest.headers.set('x-vercel-cron', '1');
    });

    it('should process all users with player_tag', async () => {
      const users = [
        { id: 'user1', email: 'user1@test.com', user_metadata: { player_tag: '#USER1' } },
        { id: 'user2', email: 'user2@test.com', user_metadata: { player_tag: '#USER2' } },
        { id: 'user3', email: 'user3@test.com', user_metadata: {} }, // No player_tag
      ];

      mockStore.auth.admin.listUsers.mockResolvedValue({
        data: { users },
        error: null,
      });

      (syncBattlesForUser as jest.Mock)
        .mockResolvedValueOnce({
          battlesProcessed: 5,
          recordsUpdated: 3,
          newBattles: 2,
          deletedBattles: 0,
          errors: [],
        })
        .mockResolvedValueOnce({
          battlesProcessed: 3,
          recordsUpdated: 2,
          newBattles: 1,
          deletedBattles: 0,
          errors: [],
        });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.totalUsers).toBe(3);
      expect(data.usersWithPlayerTag).toBe(2);
      expect(data.usersProcessed).toBe(2);
      expect(data.usersSucceeded).toBe(2);
      expect(data.usersFailed).toBe(0);
      expect(data.results).toHaveLength(2);
      expect(syncBattlesForUser).toHaveBeenCalledTimes(2);
      expect(syncBattlesForUser).toHaveBeenCalledWith('user1', '#USER1');
      expect(syncBattlesForUser).toHaveBeenCalledWith('user2', '#USER2');
    });

    it('should skip users without player_tag', async () => {
      const users = [
        { id: 'user1', email: 'user1@test.com', user_metadata: {} },
        { id: 'user2', email: 'user2@test.com', user_metadata: { player_tag: '#USER2' } },
      ];

      mockStore.auth.admin.listUsers.mockResolvedValue({
        data: { users },
        error: null,
      });

      (syncBattlesForUser as jest.Mock).mockResolvedValueOnce({
        battlesProcessed: 3,
        recordsUpdated: 2,
        newBattles: 1,
        deletedBattles: 0,
        errors: [],
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.usersWithPlayerTag).toBe(1);
      expect(data.usersProcessed).toBe(1);
      expect(syncBattlesForUser).toHaveBeenCalledTimes(1);
      expect(syncBattlesForUser).toHaveBeenCalledWith('user2', '#USER2');
    });

    it('should handle empty user list', async () => {
      mockStore.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.totalUsers).toBe(0);
      expect(data.usersWithPlayerTag).toBe(0);
      expect(data.usersProcessed).toBe(0);
      expect(data.results).toHaveLength(0);
      expect(syncBattlesForUser).not.toHaveBeenCalled();
    });

    it('should handle errors when fetching users', async () => {
      // Mock listUsers to return an error (Supabase returns { data: { users: null }, error: {...} } on error)
      mockStore.auth.admin.listUsers.mockResolvedValue({
        data: { users: null },
        error: { message: 'Database error' },
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      // The route returns "Failed to fetch users" when listUsers fails
      expect(data.error).toBe('Failed to fetch users');
    });

    it('should handle partial failures (some users succeed, some fail)', async () => {
      const users = [
        { id: 'user1', email: 'user1@test.com', user_metadata: { player_tag: '#USER1' } },
        { id: 'user2', email: 'user2@test.com', user_metadata: { player_tag: '#USER2' } },
        { id: 'user3', email: 'user3@test.com', user_metadata: { player_tag: '#USER3' } },
      ];

      mockStore.auth.admin.listUsers.mockResolvedValue({
        data: { users },
        error: null,
      });

      (syncBattlesForUser as jest.Mock)
        .mockResolvedValueOnce({
          battlesProcessed: 5,
          recordsUpdated: 3,
          newBattles: 2,
          deletedBattles: 0,
          errors: [],
        })
        .mockRejectedValueOnce(new Error('Sync failed for user2'))
        .mockResolvedValueOnce({
          battlesProcessed: 3,
          recordsUpdated: 2,
          newBattles: 1,
          deletedBattles: 0,
          errors: [],
        });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.usersSucceeded).toBe(2);
      expect(data.usersFailed).toBe(1);
      expect(data.results).toHaveLength(3);
      expect(data.results[0].success).toBe(true);
      expect(data.results[1].success).toBe(false);
      expect(data.results[1].error).toBe('Sync failed for user2');
      expect(data.results[2].success).toBe(true);
    });

    it('should process users sequentially', async () => {
      const users = [
        { id: 'user1', email: 'user1@test.com', user_metadata: { player_tag: '#USER1' } },
        { id: 'user2', email: 'user2@test.com', user_metadata: { player_tag: '#USER2' } },
      ];

      mockStore.auth.admin.listUsers.mockResolvedValue({
        data: { users },
        error: null,
      });

      const callOrder: string[] = [];
      (syncBattlesForUser as jest.Mock).mockImplementation((userId: string) => {
        callOrder.push(userId);
        return Promise.resolve({
          battlesProcessed: 0,
          recordsUpdated: 0,
          newBattles: 0,
          deletedBattles: 0,
          errors: [],
        });
      });

      await GET(mockRequest);

      expect(callOrder).toEqual(['user1', 'user2']);
      expect(syncBattlesForUser).toHaveBeenCalledTimes(2);
    });

    it('should return correct response structure', async () => {
      const users = [
        { id: 'user1', email: 'user1@test.com', user_metadata: { player_tag: '#USER1' } },
      ];

      mockStore.auth.admin.listUsers.mockResolvedValue({
        data: { users },
        error: null,
      });

      (syncBattlesForUser as jest.Mock).mockResolvedValueOnce({
        battlesProcessed: 5,
        recordsUpdated: 3,
        newBattles: 2,
        deletedBattles: 1,
        errors: [],
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('totalUsers');
      expect(data).toHaveProperty('usersWithPlayerTag');
      expect(data).toHaveProperty('usersProcessed');
      expect(data).toHaveProperty('usersSucceeded');
      expect(data).toHaveProperty('usersFailed');
      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('errors');
      expect(data.results[0]).toHaveProperty('userId');
      expect(data.results[0]).toHaveProperty('email');
      expect(data.results[0]).toHaveProperty('playerTag');
      expect(data.results[0]).toHaveProperty('success');
      expect(data.results[0]).toHaveProperty('result');
      expect(data.results[0].result).toHaveProperty('battlesProcessed');
      expect(data.results[0].result).toHaveProperty('newBattles');
      expect(data.results[0].result).toHaveProperty('errors');
    });

    it('should handle general errors gracefully', async () => {
      mockStore.auth.admin.listUsers.mockRejectedValue(new Error('Unexpected error'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to sync battles');
    });
  });
});

