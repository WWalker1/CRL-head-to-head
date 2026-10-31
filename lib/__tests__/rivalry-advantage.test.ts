import { summarizeRivalryAdvantage } from '../rivalry-advantage';

const rows = Array.from({ length: 10 }, (_, i) => ({ physical_match_id: String(i), opponent_tag: '#P0YQ', battle_time: '2026-10-22T12:00:00Z', mode: 'ranked', friend_result: i < 4 ? 'loss' as const : 'win' as const, expected_win_probability: .8, prediction_model_version: 'v1', prediction_training_cutoff: '2026-10-01T00:00:00Z', prediction_eligible: true }));

it('gives the 4–6 owner an adjusted edge when their decks predicted two wins', () => {
  const value = summarizeRivalryAdvantage(rows, 'p0yq', 'v1');
  expect(value).toMatchObject({ wins: 4, losses: 6, scoredMatches: 10, performanceEdge: 'you', deckAdvantage: 'friend', provisional: true });
  expect(value.expectedWins).toBeCloseTo(2);
  expect(value.winsAboveExpected).toBeCloseTo(2);
});
it('excludes other opponents, duplicates and unsupported modes', () => {
  const value = summarizeRivalryAdvantage([...rows, rows[0], { ...rows[0], physical_match_id: 'other', opponent_tag: '#Q0YQ' }, { ...rows[0], physical_match_id: 'team', mode: '2v2' }], '#P0YQ', 'v1');
  expect(value.scoredMatches).toBe(10);
});
it('does not invent estimates for wrong versions, pretraining games or missing owners', () => {
  expect(summarizeRivalryAdvantage(rows, '#P0YQ', 'v2')).toMatchObject({ scoredMatches: 0, performanceEdge: 'insufficient' });
  expect(summarizeRivalryAdvantage(rows.map(row => ({ ...row, prediction_training_cutoff: '2026-11-01' })), '#P0YQ', 'v1').scoredMatches).toBe(0);
  expect(summarizeRivalryAdvantage(rows, undefined, 'v1')).toMatchObject({ wins: 0, losses: 0, ownerKnown: false });
});
it('separates draws and withholds an edge in tiny samples', () => {
  const value = summarizeRivalryAdvantage([...rows.slice(0, 4), { ...rows[4], friend_result: 'draw' }], '#P0YQ', 'v1');
  expect(value).toMatchObject({ wins: 4, draws: 1, scoredMatches: 4, performanceEdge: 'insufficient' });
});
