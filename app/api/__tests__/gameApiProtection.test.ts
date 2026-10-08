/** @jest-environment node */
import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';
jest.mock('@supabase/supabase-js', () => {
  const client = { auth: { getUser: jest.fn() }, from: jest.fn() };
  return { createClient: jest.fn(() => client) };
});
const mockClient = (createClient as jest.Mock)();
jest.mock('@/lib/supabase-server', () => ({ createClient: async () => mockClient }));
jest.mock('@/lib/game-api-budget', () => ({ reserveGameApi: jest.fn() }));
jest.mock('@/lib/anonymous-rate-limit', () => ({ checkAnonymousRateLimit: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/clashRoyaleApi', () => ({ getPlayerInfo: jest.fn(), getPlayerBattleLog: jest.fn() }));
jest.mock('@/utils/battleProcessor', () => ({ syncBattlesForUser: jest.fn() }));
import { reserveGameApi } from '@/lib/game-api-budget';
import { getPlayerInfo, getPlayerBattleLog } from '@/lib/clashRoyaleApi';
import { syncBattlesForUser } from '@/utils/battleProcessor';
import { POST as sync } from '../sync-battles/route';
import { POST as friend } from '../friend-decks/route';
import { POST as add } from '../add-friend/route';
import { POST as validate } from '../validate-player/route';

describe('game API route budget enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://db.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-secret';
    mockClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'owner', user_metadata: { player_tag: '#OWNER' } } }, error: null });
    mockClient.from.mockImplementation(() => {
      const query: any = { select: () => query, eq: () => query,
        maybeSingle: async () => ({ data: { id: 'friend', friend_player_tag: '#FRIEND' }, error: null }),
        then: (resolve: any) => Promise.resolve({ count: 0, error: null }).then(resolve),
      };
      return query;
    });
  });

  it.each([['sync', sync], ['friend_refresh', friend], ['add_friend', add], ['validate', validate]] as const)(
    '%s never reaches the game API when limited or when quotas are unavailable', async (operation, handler) => {
      for (const status of [429, 503]) {
        (reserveGameApi as jest.Mock).mockResolvedValue({ response: NextResponse.json({ error: 'Limited' }, { status }) });
        const request = new NextRequest('https://rival.example/api/test', {
          method: 'POST', headers: { authorization: 'Bearer valid', 'content-type': 'application/json' },
          body: JSON.stringify({ friendId: 'friend', friendTag: '#FRIEND', playerTag: '#OWNER' }),
        });
        const response = await handler(request);
        expect(response.status).toBe(status);
        expect(reserveGameApi).toHaveBeenLastCalledWith(request, operation === 'validate' ? null : 'owner', operation);
        expect(getPlayerInfo).not.toHaveBeenCalled();
        expect(getPlayerBattleLog).not.toHaveBeenCalled();
        expect(syncBattlesForUser).not.toHaveBeenCalled();
      }
    },
  );

  it('releases a sync lease on upstream failure', async () => {
    const release = jest.fn().mockResolvedValue(undefined);
    (reserveGameApi as jest.Mock).mockResolvedValue({ release });
    (syncBattlesForUser as jest.Mock).mockRejectedValue(new Error('upstream unavailable'));
    const response = await sync(new NextRequest('https://rival.example/api/sync-battles', { method: 'POST', headers: { authorization: 'Bearer valid' } }));
    expect(response.status).toBe(500);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('releases a friend lease on upstream failure', async () => {
    const release = jest.fn().mockResolvedValue(undefined);
    (reserveGameApi as jest.Mock).mockResolvedValue({ release });
    (getPlayerBattleLog as jest.Mock).mockRejectedValue(new Error('upstream unavailable'));
    const response = await friend(new NextRequest('https://rival.example/api/friend-decks', {
      method: 'POST', headers: { authorization: 'Bearer valid', 'content-type': 'application/json' }, body: JSON.stringify({ friendId: 'friend' }),
    }));
    expect(response.status).toBe(503);
    expect(release).toHaveBeenCalledTimes(1);
  });
});
