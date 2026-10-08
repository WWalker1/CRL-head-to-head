import { buildPlayerStats, type PlayerStatsRow } from '../player-stats';
import type { MatchupSkillSummary } from '../matchup-skill';

const skill = {} as MatchupSkillSummary;
const row = (id: string, result: 'win' | 'loss' | 'draw', probability: number, overrides: Partial<PlayerStatsRow> = {}): PlayerStatsRow => ({
  physical_match_id: id, battle_time: '2026-09-20T00:00:00.000Z', mode: 'ranked', result,
  expected_win_probability: probability, prediction_model_version: 'v1', prediction_eligible: true,
  player_deck: { cards: [{ id: '1', name: 'Knight' }] }, opponent_deck: { cards: [{ id: '2', name: 'Archers' }] }, ...overrides,
});

describe('buildPlayerStats', () => {
  it('ranks the strongest supported wins and most model-favored losses across constructed 1v1 modes', () => {
    const rows = [
      row('fav-1', 'loss', 0.82), row('fav-2', 'loss', 0.64), row('under-threshold', 'loss', 0.59),
      row('tough-1', 'win', 0.12), row('tough-2', 'win', 0.39), row('over-threshold', 'win', 0.4),
      row('old-version', 'loss', 0.99, { prediction_model_version: 'old' }),
      row('unsupported', 'win', 0.01, { prediction_eligible: false }),
      row('draw', 'draw', 0.01),
      row('ladder', 'loss', 0.99, { mode: 'ladder' }),
      row('challenge-fav', 'loss', 0.99, { mode: 'challenge' }),
      row('challenge-upset', 'win', 0.05, { mode: 'challenge' }),
      row('other-fav', 'loss', 1, { mode: 'other' }),
      row('other-upset', 'win', 0, { mode: 'other' }),
    ];
    const result = buildPlayerStats(rows, 'v1', skill);
    expect(result.favorableLosses.map(match => match.id)).toEqual(['other-fav', 'ladder', 'challenge-fav', 'fav-1', 'fav-2']);
    expect(result.toughWins.map(match => match.id)).toEqual(['other-upset', 'challenge-upset', 'tough-1', 'tough-2', 'over-threshold']);
    expect(result.scoredMatches).toBe(11);
    expect(result.modelVersion).toBe('v1');
  });

  it('limits the analysis to the latest 100 eligible 1v1 matches, including other constructed modes', () => {
    const rows = Array.from({ length: 101 }, (_, index) => row(`m-${index}`, 'loss', 0.9, {
      mode: index === 100 ? 'challenge' : 'ranked',
      battle_time: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
    }));
    rows.push(row('special-other', 'loss', 1, { mode: 'other', battle_time: '2026-12-31T00:00:00.000Z' }));
    const result = buildPlayerStats(rows, 'v1', skill);
    expect(result.windowMatches).toBe(100);
    expect(result.favorableLosses).toHaveLength(5);
    expect(result.firstMatch).toBe(rows[2].battle_time);
    expect(result.lastMatch).toBe('2026-12-31T00:00:00.000Z');
    expect(result.favorableLosses.some(match => match.id === 'special-other')).toBe(true);
  });
});
