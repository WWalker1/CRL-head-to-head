import { getPlayerBattleLog } from '@/lib/clashRoyaleApi';
import { captureUserHistory } from '@/lib/history-storage';
import { createClient } from '@supabase/supabase-js';
import { syncBattlesForUser } from '../battleProcessor';

jest.mock('@/lib/clashRoyaleApi', () => ({ getPlayerBattleLog: jest.fn() }));
jest.mock('@/lib/history-storage', () => ({ captureUserHistory: jest.fn() }));

const friends = [{ id: 'tracked-1', friend_player_tag: '#FRIEND' }];
jest.mock('@supabase/supabase-js', () => {
  const from = jest.fn((table: string) => {
    if (table === 'tracked_friends') {
      return { select: () => ({ eq: () => ({ data: [{ id: 'tracked-1', friend_player_tag: '#FRIEND' }], error: null }) }) };
    }
    if (table === 'user_ratings') {
      // End the legacy rating path after verifying history capture.
      return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { code: 'TEST_STOP' } }) }) }) };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  return { createClient: jest.fn(() => ({ from })) };
});

const mockFrom = (createClient as jest.Mock)().from as jest.Mock;

describe('sync history integration', () => {
  const originalFlag = process.env.MATCH_HISTORY_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getPlayerBattleLog).mockResolvedValue([]);
    jest.mocked(captureUserHistory).mockResolvedValue([]);
  });

  afterAll(() => {
    if (originalFlag === undefined) delete process.env.MATCH_HISTORY_ENABLED;
    else process.env.MATCH_HISTORY_ENABLED = originalFlag;
  });

  it('captures owner and tracked friend history during sync when enabled', async () => {
    process.env.MATCH_HISTORY_ENABLED = '1';
    await syncBattlesForUser('owner-1', '#PLAYER');
    expect(getPlayerBattleLog).toHaveBeenCalledWith('#PLAYER');
    expect(captureUserHistory).toHaveBeenCalledWith(expect.anything(), 'owner-1', '#PLAYER', [], friends);
    expect(mockFrom).toHaveBeenCalledWith('tracked_friends');
  });

  it('does not write history when disabled', async () => {
    delete process.env.MATCH_HISTORY_ENABLED;
    await syncBattlesForUser('owner-1', '#PLAYER');
    expect(captureUserHistory).not.toHaveBeenCalled();
  });
});
