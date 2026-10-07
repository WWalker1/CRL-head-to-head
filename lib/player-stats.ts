import { SKILL_MODES, type MatchupSkillSummary } from './matchup-skill';

export type PlayerStatsRow = {
  physical_match_id: string;
  battle_time: string;
  mode: string;
  friend_result?: 'win' | 'loss' | 'draw';
  result?: 'win' | 'loss' | 'draw';
  friend_deck?: any;
  player_deck?: any;
  opponent_deck?: any;
  expected_win_probability?: number | null;
  prediction_model_version?: string | null;
  prediction_eligible?: boolean | null;
};

export type MatchupHighlight = {
  id: string;
  date: string;
  result: 'win' | 'loss';
  expectedWinProbability: number;
  playerDeck: any;
  opponentDeck: any;
};

export type PlayerStats = {
  skill: MatchupSkillSummary;
  modelVersion: string | null;
  windowMatches: number;
  scoredMatches: number;
  firstMatch: string | null;
  lastMatch: string | null;
  favorableLosses: MatchupHighlight[];
  toughWins: MatchupHighlight[];
};

function usableProbability(row: PlayerStatsRow, modelVersion: string | null) {
  const probability = row.expected_win_probability;
  return Boolean(modelVersion && row.prediction_model_version === modelVersion && row.prediction_eligible === true &&
    typeof probability === 'number' && Number.isFinite(probability) && probability >= 0 && probability <= 1);
}

function highlight(row: PlayerStatsRow): MatchupHighlight {
  return {
    id: row.physical_match_id,
    date: row.battle_time,
    result: (row.friend_result ?? row.result) as 'win' | 'loss',
    expectedWinProbability: row.expected_win_probability!,
    playerDeck: row.friend_deck ?? row.player_deck,
    opponentDeck: row.opponent_deck,
  };
}

/** Current-model highlights are restricted to supported estimates in the same latest-100 window as skill. */
export function buildPlayerStats(rows: PlayerStatsRow[], modelVersion: string | null, skill: MatchupSkillSummary): PlayerStats {
  const window = rows
    .filter(row => SKILL_MODES.has(row.mode) && ['win', 'loss'].includes(row.friend_result ?? row.result ?? ''))
    .sort((a, b) => Date.parse(b.battle_time) - Date.parse(a.battle_time))
    .slice(0, 100);
  const scored = window.filter(row => usableProbability(row, modelVersion));
  const favorableLosses = scored.filter(row => (row.friend_result ?? row.result) === 'loss')
    .sort((a, b) => b.expected_win_probability! - a.expected_win_probability! || Date.parse(b.battle_time) - Date.parse(a.battle_time))
    .slice(0, 5).map(highlight);
  const toughWins = scored.filter(row => (row.friend_result ?? row.result) === 'win')
    .sort((a, b) => a.expected_win_probability! - b.expected_win_probability! || Date.parse(b.battle_time) - Date.parse(a.battle_time))
    .slice(0, 5).map(highlight);
  const dates = window.map(row => row.battle_time).filter(date => Number.isFinite(Date.parse(date))).sort((a, b) => Date.parse(a) - Date.parse(b));
  return {
    skill, modelVersion, windowMatches: window.length, scoredMatches: scored.length,
    firstMatch: dates[0] ?? null, lastMatch: dates[dates.length - 1] ?? null,
    favorableLosses, toughWins,
  };
}
