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

// Import route AFTER mocks are set up
import { DELETE } from '../route';

describe('Remove Friend Route', () => {
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
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendId: 'friend-1' });

      const response = await DELETE(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockStore.supabase.auth.getUser).not.toHaveBeenCalled();
    });

    it('should return unauthorized for invalid token', async () => {
      mockRequest.headers.set('authorization', 'Bearer invalid-token');
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendId: 'friend-1' });

      mockStore.supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const response = await DELETE(mockRequest);
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
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendId: 'friend-1' });

      mockStore.supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockStore.supabase.from.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      await DELETE(mockRequest);

      expect(mockStore.supabase.auth.getUser).toHaveBeenCalledWith('valid-token');
    });
  });

  describe('Friend Removal', () => {
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

    it('should require friendId in request body', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({});

      const response = await DELETE(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Friend ID is required');
    });

    it('should remove friend only for the requesting user', async () => {
      const userId = 'user-id';
      const friendId = 'friend-1';
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendId });

      const deleteMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockStore.supabase.from.mockReturnValue({
        delete: deleteMock,
        eq: eqMock,
      });

      deleteMock.mockReturnValue({
        eq: eqMock,
      });

      const response = await DELETE(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deleteMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('id', friendId);
      expect(eqMock).toHaveBeenCalledWith('user_id', userId);
    });

    it('should verify user can only remove their own friends', async () => {
      const userId = 'user-id';
      const friendId = 'friend-1';
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendId });

      const deleteMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockStore.supabase.from.mockReturnValue({
        delete: deleteMock,
        eq: eqMock,
      });

      deleteMock.mockReturnValue({
        eq: eqMock,
      });

      await DELETE(mockRequest);

      // Verify both user_id and id are checked
      const calls = eqMock.mock.calls;
      expect(calls).toContainEqual(['id', friendId]);
      expect(calls).toContainEqual(['user_id', userId]);
    });

    it('should handle database errors when removing friend', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendId: 'friend-1' });

      mockStore.supabase.from.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      const response = await DELETE(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to remove friend');
    });

    it('should return appropriate error for general failures', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendId: 'friend-1' });

      mockStore.supabase.from.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockRejectedValue(new Error('Unexpected error')),
      });

      const response = await DELETE(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to remove friend');
    });

    it('should return success even if friend does not exist', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({ friendId: 'non-existent' });

      mockStore.supabase.from.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null, // No error, but also no rows deleted
        }),
      });

      const response = await DELETE(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

