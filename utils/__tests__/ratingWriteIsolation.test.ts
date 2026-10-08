/** @jest-environment node */
import { createMockBattle } from './testHelpers';

const mockWrites: Array<{ table: string; values: any; filters: Array<[string, unknown]> }> = [];
import { createClient } from '@supabase/supabase-js';
jest.mock('@supabase/supabase-js', () => {
  const client = { from: jest.fn(), rpc: jest.fn().mockResolvedValue({ error: null }) };
  return { createClient: jest.fn(() => client) };
});
const mockClient = (createClient as jest.Mock)();
jest.mock('@/lib/clashRoyaleApi', () => ({ getPlayerBattleLog: jest.fn() }));
import { getPlayerBattleLog } from '@/lib/clashRoyaleApi';
import { syncBattlesForUser } from '../battleProcessor';

it('cannot update a victim account by selecting its public game tag', async () => {
  const oldHistory = process.env.MATCH_HISTORY_ENABLED;
  process.env.MATCH_HISTORY_ENABLED = '0';
  mockWrites.length = 0;
  mockClient.from.mockImplementation((table: string) => {
    let write: typeof mockWrites[number] | undefined;
    const filters: Array<[string, unknown]> = [];
    const query: any = {
      select: () => query,
      eq: (column: string, value: unknown) => { filters.push([column, value]); return query; },
      update: (values: any) => { write = { table, values, filters }; mockWrites.push(write); return query; },
      insert: (values: any) => { write = { table, values, filters }; mockWrites.push(write); return query; },
      order: () => query, limit: () => query,
      single: async () => ({ data: table === 'user_ratings' ? { elo_rating: 1500, num_ranked_games: 0, player_tag: '#VICTIM' } : null, error: null }),
      then: (resolve: any) => Promise.resolve({ data: table === 'tracked_friends' ? [{ id: 'friend', friend_player_tag: '#OPPONENT' }] : [], error: null }).then(resolve),
    };
    return query;
  });
  (getPlayerBattleLog as jest.Mock).mockResolvedValue([createMockBattle({
    type: 'PVP', team: [{ tag: '#VICTIM', name: 'Victim', crowns: 3 }],
    opponent: [{ tag: '#OPPONENT', name: 'Opponent', crowns: 0 }],
  })]);
  try {
    const result = await syncBattlesForUser('attacker-account', '#VICTIM');
    expect(result.newBattles).toBe(1);
    expect(result.errors).toEqual([]);
    const ratingWrites = mockWrites.filter(write => write.table === 'user_ratings');
    expect(ratingWrites).toHaveLength(1);
    expect(ratingWrites[0].filters).toEqual([['user_id', 'attacker-account']]);
    expect(ratingWrites[0].values.elo_rating).toBeGreaterThan(1500);
    expect(mockClient.rpc).toHaveBeenCalledWith('increment_win', { p_user_id: 'attacker-account', p_friend_tag: '#OPPONENT' });
  } finally {
    if (oldHistory === undefined) delete process.env.MATCH_HISTORY_ENABLED;
    else process.env.MATCH_HISTORY_ENABLED = oldHistory;
  }
});
