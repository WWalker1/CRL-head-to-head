import { summarizeMatchupSkill, type MatchupSkillRow } from '../matchup-skill';

const version = 'model-v1';
function row(id: string, result: 'win' | 'loss' | 'draw', probability: number | null = 0.5, overrides: Partial<MatchupSkillRow> = {}): MatchupSkillRow {
  return {
    physical_match_id: id,
    mode: 'ranked',
    friend_result: result,
    expected_win_probability: probability,
    prediction_model_version: version,
    prediction_eligible: true,
    ...overrides,
  };
}

describe('summarizeMatchupSkill', () => {
  it('rewards wins against tougher predictions more', () => {
    const toughWin = summarizeMatchupSkill([row('tough', 'win', 0.2), row('loss', 'loss', 0.5)], version);
    const expectedWin = summarizeMatchupSkill([row('even', 'win', 0.5), row('loss', 'loss', 0.5)], version);
    expect(toughWin.winsAboveExpected).toBeCloseTo(0.3);
    expect(toughWin.score).toBeGreaterThan(expectedWin.score!);
  });

  it('penalizes losing as a favorite more than losing as an underdog', () => {
    const favoriteLoss = summarizeMatchupSkill([row('fav', 'loss', 0.8)], version);
    const underdogLoss = summarizeMatchupSkill([row('dog', 'loss', 0.2)], version);
    expect(favoriteLoss.score).toBeLessThan(underdogLoss.score!);
    expect(favoriteLoss.winsAboveExpected).toBeCloseTo(-0.8);
  });

  it('is neutral when actual wins equal expected wins and rounds to one decimal', () => {
    const result = summarizeMatchupSkill([
      row('win', 'win', 0.7),
      row('loss', 'loss', 0.3),
    ], version);
    expect(result.winsAboveExpected).toBeCloseTo(0);
    expect(result.score).toBe(50);
  });

  it('ignores draws, unsupported modes, ineligible predictions, bad probabilities and other models', () => {
    const rows = [
      row('draw', 'draw', 0.2),
      row('ladder', 'win', 0.1, { mode: 'ladder', prediction_eligible: false }),
      row('unsupported', 'win', 0.1, { mode: 'draft' }),
      row('excluded', 'win', 0.1, { prediction_eligible: false }),
      row('wrong-model', 'win', 0.1, { prediction_model_version: 'model-v2' }),
      row('nan', 'win', Number.NaN),
      row('too-low', 'win', -0.01),
      row('too-high', 'win', 1.01),
    ];
    const result = summarizeMatchupSkill(rows, version);
    expect(result.score).toBeNull();
    expect(result.scoredMatches).toBe(0);
    expect(result.eligibleMatches).toBe(6);
    expect(result.provisional).toBe(true);
  });

  it('counts decisive standard 1v1 rows as eligible even when not scoreable, after deduplication', () => {
    const result = summarizeMatchupSkill([
      row('one', 'win', null),
      row('one', 'loss', 0.9),
      row('two', 'loss', 0.5, { prediction_eligible: false }),
      row('draw', 'draw', 0.4),
      row('ladder', 'win', 0.4, { mode: 'ladder', prediction_eligible: false }),
      row('challenge', 'win', null, { mode: 'challenge' }),
      row('other', 'win', 0.4, { mode: 'other', prediction_eligible: false }),
    ], version);
    expect(result.eligibleMatches).toBe(5);
    expect(result.scoredMatches).toBe(0);
  });

  it('shows the smoothed recent record score when no model score is available and null with no games', () => {
    const noGames = summarizeMatchupSkill([], version);
    expect(noGames.recordScore).toBeNull();

    const partial = summarizeMatchupSkill([
      row('ladder-win', 'win', 0.8, { mode: 'ladder' }),
      row('challenge-loss', 'loss', 0.2, { mode: 'challenge' }),
      row('unsupported', 'win', 0.01, { mode: 'draft' }),
      row('draw', 'draw', 0.5),
    ], null);
    expect(partial.score).toBeNull();
    expect(partial.eligibleMatches).toBe(2);
    expect(partial.recordWins).toBe(1);
    expect(partial.recordLosses).toBe(1);
    expect(partial.recordScore).toBe(50);
  });

  it('scores every normalized constructed 1v1 mode, including other opponents and modes', () => {
    const result = summarizeMatchupSkill([
      row('ladder-win', 'win', 0.6, { mode: 'ladder' }),
      row('ranked-loss', 'loss', 0.7),
      row('challenge-upset', 'win', 0.2, { mode: 'challenge' }),
      row('constructed-other', 'win', 0.01, { mode: 'other' }),
      row('challenge-draw', 'draw', 0.1, { mode: 'challenge' }),
    ], version);

    expect(result.eligibleMatches).toBe(4);
    expect(result.scoredMatches).toBe(4);
    expect(result.actualWins).toBe(3);
    expect(result.expectedWins).toBeCloseTo(1.51);
    expect(result.toughMatches).toBe(2);
    expect(result.toughWins).toBe(2);
  });

  it('deduplicates physical matches before scoring and reports tough-match wins', () => {
    const result = summarizeMatchupSkill([
      row('same', 'win', 0.3),
      row('same', 'loss', 0.9),
      row('tough-loss', 'loss', 0.39),
      row('not-tough', 'win', 0.4),
    ], version);
    expect(result.scoredMatches).toBe(3);
    expect(result.actualWins).toBe(2);
    expect(result.toughMatches).toBe(2);
    expect(result.toughWins).toBe(1);
  });

  it('maps twenty percentage points above expectation to 70 even in a provisional window', () => {
    const eight = summarizeMatchupSkill([
      ...Array.from({ length: 5 }, (_, i) => row(`win${i}`, 'win', 0.425)),
      ...Array.from({ length: 3 }, (_, i) => row(`loss${i}`, 'loss', 0.425)),
    ], version);
    expect(eight.actualWins).toBe(5);
    expect(eight.expectedWins).toBeCloseTo(3.4);
    expect(eight.winsAboveExpected).toBeCloseTo(1.6);
    expect(eight.score).toBe(70);
    expect(eight.provisional).toBe(true);
  });

  it('shows an upset boldly, clamps extremes, and becomes non-provisional at 30 matches', () => {
    const one = summarizeMatchupSkill([row('one', 'win', 0.22)], version);
    const oneLoss = summarizeMatchupSkill([row('one', 'loss', 0.8)], version);
    const thirty = summarizeMatchupSkill(Array.from({ length: 30 }, (_, i) => row(`m${i}`, i < 21 ? 'win' : 'loss', 0.5)), version);
    expect(one.score).toBe(100);
    expect(oneLoss.score).toBe(0);
    expect(thirty.score).toBe(70);
    expect(one.provisional).toBe(true);
    expect(thirty.provisional).toBe(false);
  });
});
