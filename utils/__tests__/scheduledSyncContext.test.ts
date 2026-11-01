/** @jest-environment node */
const from = jest.fn(() => { throw new Error('Unexpected database query'); });
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (...args: unknown[]) => from(...args as []) }) }));
jest.mock('@/lib/clashRoyaleApi', () => ({ getPlayerBattleLog: jest.fn() }));
import { syncBattlesForUser, type ScheduledSyncContext } from '../battleProcessor';
import { getPlayerBattleLog } from '@/lib/clashRoyaleApi';

const context = (): ScheduledSyncContext => ({ userId: 'owner', friends: [], rating: { player_tag: '#OWNER', elo_rating: 1500, num_ranked_games: 0, updated_at: null }, cleanupOnlyIfNewBattles: true });
const historyFlag = process.env.MATCH_HISTORY_ENABLED;
beforeEach(() => { jest.clearAllMocks(); process.env.MATCH_HISTORY_ENABLED = '0'; jest.mocked(getPlayerBattleLog).mockResolvedValue([]); });
afterAll(() => { if (historyFlag === undefined) delete process.env.MATCH_HISTORY_ENABLED; else process.env.MATCH_HISTORY_ENABLED = historyFlag; });
it('eliminates per-account friend/rating/cleanup reads for an unchanged prefetched account', async () => {
  const result = await syncBattlesForUser('owner', '#OWNER', context());
  expect(result.errors).toEqual([]);
  expect(getPlayerBattleLog).toHaveBeenCalledTimes(1);
  expect(from).not.toHaveBeenCalled();
});
it('rejects another account context before any API or database work', async () => {
  const result = await syncBattlesForUser('another-owner', '#OWNER', context());
  expect(result.errors).toEqual(['Invalid scheduled sync context']);
  expect(getPlayerBattleLog).not.toHaveBeenCalled();
  expect(from).not.toHaveBeenCalled();
});
it('rechecks the database if the prefetched player tag differs', async () => {
  const result = await syncBattlesForUser('owner', '#CHANGED', context());
  expect(result.errors).toContain('Failed to fetch player rating');
  expect(from).toHaveBeenCalledWith('user_ratings');
});
