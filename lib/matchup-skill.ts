export interface MatchupSkillRow {
  physical_match_id: string;
  mode: string;
  friend_result: 'win' | 'loss' | 'draw';
  expected_win_probability?: number | null;
  prediction_model_version?: string | null;
  prediction_eligible?: boolean | null;
}

export interface MatchupSkillSummary {
  score: number | null;
  recordScore: number | null;
  recordWins: number;
  recordLosses: number;
  scoredMatches: number;
  eligibleMatches: number;
  actualWins: number;
  expectedWins: number;
  winsAboveExpected: number;
  toughMatches: number;
  toughWins: number;
  provisional: boolean;
  modelVersion: string | null;
}

// Every normalized constructed 1v1 mode is eligible, including matches outside
// ladder, ranked, and challenge. A friend need not have played the account owner.
export const SKILL_MODES = new Set(['ladder', 'ranked', 'challenge', 'other']);

/** Compare recent constructed 1v1 results with a supported deck model. */
export function summarizeMatchupSkill(
  rows: MatchupSkillRow[],
  modelVersion: string | null,
): MatchupSkillSummary {
  const seen = new Set<string>();
  const deduped = rows.filter(row => {
    if (!row.physical_match_id || seen.has(row.physical_match_id)) return false;
    seen.add(row.physical_match_id);
    return true;
  });

  const decisive = deduped.filter(row => SKILL_MODES.has(row.mode) && row.friend_result !== 'draw');
  const recordWins = decisive.filter(row => row.friend_result === 'win').length;
  const recordLosses = decisive.length - recordWins;
  const scored = decisive.filter(row =>
    Boolean(modelVersion) &&
    row.prediction_eligible === true &&
    row.prediction_model_version === modelVersion &&
    typeof row.expected_win_probability === 'number' &&
    Number.isFinite(row.expected_win_probability) &&
    row.expected_win_probability >= 0 &&
    row.expected_win_probability <= 1,
  );

  const actualWins = scored.reduce((sum, row) => sum + (row.friend_result === 'win' ? 1 : 0), 0);
  const expectedWins = scored.reduce((sum, row) => sum + row.expected_win_probability!, 0);
  const winsAboveExpected = actualWins - expectedWins;
  const toughRows = scored.filter(row => row.expected_win_probability! < 0.4);
  const scoredMatches = scored.length;

  return {
    score: scoredMatches === 0
      ? null
      // Twenty percentage points above the model's expected win rate maps to
      // 70/100. Keep the estimate vivid even in a short window; the UI labels
      // those windows provisional instead of silently pulling them toward 50.
      : Math.round(Math.max(0, Math.min(100, 50 + 100 * winsAboveExpected / scoredMatches)) * 10) / 10,
    recordScore: decisive.length === 0 ? null : Math.round(1000 * (recordWins + 5) / (decisive.length + 10)) / 10,
    recordWins,
    recordLosses,
    scoredMatches,
    eligibleMatches: decisive.length,
    actualWins,
    expectedWins,
    winsAboveExpected,
    toughMatches: toughRows.length,
    toughWins: toughRows.filter(row => row.friend_result === 'win').length,
    provisional: scoredMatches < 30,
    modelVersion,
  };
}
