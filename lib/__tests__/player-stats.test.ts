import { buildPlayerStats, type PlayerStatsRow } from '../player-stats';
import type { MatchupSkillSummary } from '../matchup-skill';

const skill = {} as MatchupSkillSummary;
const row = (id: string, result: 'win' | 'loss' | 'draw', probability: number, overrides: Partial<PlayerStatsRow> = {}): PlayerStatsRow => ({
  physical_match_id: id, battle_time: '2026-09-20T00:00:00.000Z', mode: 'ranked', result,
  expected_win_probability: probability, prediction_model_version: 'v1', prediction_eligible: true,
  player_deck: { cards: [{ id: '1', name: 'Knight' }] }, opponent_deck: { cards: [{ id: '2', name: 'Archers' }] }, ...overrides,
});

describe('buildPlayerStats', () => {
  it('ranks current supported favored losses and tough wins, excluding other estimates', () => {
    const rows = [
      row('fav-1', 'loss', 0.82), row('fav-2', 'loss', 0.64), row('under-threshold', 'loss', 0.59),
      row('tough-1', 'win', 0.12), row('tough-2', 'win', 0.39), row('over-threshold', 'win', 0.4),
      row('old-version', 'loss', 0.99, { prediction_model_version: 'old' }),
      row('unsupported', 'win', 0.01, { prediction_eligible: false }),
      row('draw', 'draw', 0.01),
      row('ladder', 'loss', 0.99, { mode: 'ladder' }),
    ];
    const result = buildPlayerStats(rows, 'v1', skill);
    expect(result.favorableLosses.map(match => match.id)).toEqual(['fav-1', 'fav-2']);
    expect(result.toughWins.map(match => match.id)).toEqual(['tough-1', 'tough-2']);
    expect(result.scoredMatches).toBe(6);
    expect(result.modelVersion).toBe('v1');
  });

  it('limits the analysis and date range to the latest 100 decisive ranked matches', () => {
    const rows = Array.from({ length: 101 }, (_, index) => row(`m-${index}`, 'loss', 0.9, { battle_time: new Date(Date.UTC(2026, 0, 1 + index)).toISOString() }));
    const result = buildPlayerStats(rows, 'v1', skill);
    expect(result.windowMatches).toBe(100);
    expect(result.favorableLosses).toHaveLength(5);
    expect(result.firstMatch).toBe(rows[1].battle_time);
    expect(result.lastMatch).toBe(rows[100].battle_time);
  });
});
