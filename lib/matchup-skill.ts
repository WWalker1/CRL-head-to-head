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

/** Summarize a player's ranked results against the selected model's expectations. */
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

  const decisiveRanked = deduped.filter(row => row.mode === 'ranked' && row.friend_result !== 'draw');
  const scored = decisiveRanked.filter(row =>
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
      : Math.round(Math.max(0, Math.min(100, 50 + 50 * winsAboveExpected / (scoredMatches + 20))) * 10) / 10,
    scoredMatches,
    eligibleMatches: decisiveRanked.length,
    actualWins,
    expectedWins,
    winsAboveExpected,
    toughMatches: toughRows.length,
    toughWins: toughRows.filter(row => row.friend_result === 'win').length,
    provisional: scoredMatches < 30,
    modelVersion,
  };
}
