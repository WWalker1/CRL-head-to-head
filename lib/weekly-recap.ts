import { FRIEND_HISTORY_LIMIT } from './history-limits';
import type { FriendHistoryLog } from './friend-history';
import { SKILL_MODES, summarizeMatchupSkill, type MatchupSkillRow } from './matchup-skill';

type RecapRow = FriendHistoryLog & Partial<MatchupSkillRow>;
export type WeeklyRecap = {
  from: string;
  through: string;
  recordedGames: number;
  wins: number;
  losses: number;
  draws: number;
  scoredGames: number;
  winsAboveExpected: number | null;
  firstRecorded: string | null;
  lastRecorded: string | null;
  retentionLimitReached: boolean;
  toughestWin: { date: string; probability: number } | null;
};

/** A trailing seven-day view of retained records, never a complete-week claim. */
export function buildWeeklyRecap(rows: RecapRow[], modelVersion: string | null, now = Date.now()): WeeklyRecap {
  const from = now - 7 * 24 * 60 * 60 * 1000;
  const unique = new Map<string, RecapRow>();
  for (const row of rows) {
    const time = Date.parse(row.battle_time);
    if (row.physical_match_id && SKILL_MODES.has(row.mode) && ['win', 'loss', 'draw'].includes(row.friend_result) && time >= from && time <= now) unique.set(row.physical_match_id, row);
  }
  const recent = [...unique.values()].sort((a, b) => Date.parse(b.battle_time) - Date.parse(a.battle_time));
  const skill = summarizeMatchupSkill(recent, modelVersion);
  const wins = recent.filter(row => row.friend_result === 'win');
  const toughest = wins.filter(row => modelVersion && row.prediction_eligible === true && row.prediction_model_version === modelVersion && typeof row.expected_win_probability === 'number' && Number.isFinite(row.expected_win_probability) && row.expected_win_probability >= 0 && row.expected_win_probability < 0.4)
    .sort((a, b) => a.expected_win_probability! - b.expected_win_probability!)[0];
  return {
    from: new Date(from).toISOString(), through: new Date(now).toISOString(),
    recordedGames: recent.length, wins: wins.length, losses: recent.filter(row => row.friend_result === 'loss').length,
    draws: recent.filter(row => row.friend_result === 'draw').length,
    scoredGames: skill.scoredMatches, winsAboveExpected: skill.scoredMatches ? skill.winsAboveExpected : null,
    firstRecorded: recent.at(-1)?.battle_time ?? null, lastRecorded: recent[0]?.battle_time ?? null,
    retentionLimitReached: rows.length >= FRIEND_HISTORY_LIMIT,
    toughestWin: toughest ? { date: toughest.battle_time, probability: toughest.expected_win_probability! } : null,
  };
}
