import { buildWeeklyRecap } from '../weekly-recap';
import type { FriendHistoryLog } from '../friend-history';

const now = Date.parse('2026-10-22T12:00:00Z');
const row = (id: string, date: string, result: 'win' | 'loss' | 'draw' = 'win', extra = {}) => ({
  physical_match_id: id, battle_time: date, friend_result: result, mode: 'ranked', friend_deck: { cards: [] },
  prediction_eligible: true, prediction_model_version: 'v1', expected_win_probability: 0.2, ...extra,
});

it('deduplicates and excludes old/future/invalid/unsupported records while keeping draws separate', () => {
  const recent = row('a', '2026-10-20T12:00:00Z');
  const result = buildWeeklyRecap([recent, recent, row('draw', '2026-10-21T12:00:00Z', 'draw'), row('loss', '2026-10-21T13:00:00Z', 'loss'),
    row('old', '2026-10-01T12:00:00Z'), row('future', '2026-10-23T12:00:00Z'), row('bad', 'invalid'), row('team', '2026-10-20T12:00:00Z', 'win', { mode: '2v2' })], 'v1', now);
  expect(result).toMatchObject({ recordedGames: 3, wins: 1, losses: 1, draws: 1, scoredGames: 2, winsAboveExpected: 0.6, toughestWin: { probability: 0.2 }, retentionLimitReached: false });
});

it('does not mix cached model versions or invent a score during an outage', () => {
  const rows = [row('a', '2026-10-20T12:00:00Z')];
  expect(buildWeeklyRecap(rows, 'v2', now)).toMatchObject({ wins: 1, scoredGames: 0, winsAboveExpected: null, toughestWin: null });
  expect(buildWeeklyRecap(rows, null, now).winsAboveExpected).toBeNull();
});

it('reports a full retained window without claiming complete collection', () => {
  const rows: FriendHistoryLog[] = Array.from({ length: 50 }, (_, i) => row(String(i), '2026-10-20T12:00:00Z'));
  expect(buildWeeklyRecap(rows, 'v1', now)).toMatchObject({ retentionLimitReached: true, recordedGames: 50 });
  expect(buildWeeklyRecap([], null, now)).toMatchObject({ recordedGames: 0, firstRecorded: null, lastRecorded: null });
});
