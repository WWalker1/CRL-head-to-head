import { FRIEND_HISTORY_LIMIT } from './history-limits';
import {
  summarizeMatchupSkill,
  SKILL_MODES,
  type MatchupSkillRow,
} from "./matchup-skill";
import { normalizePlayerTag } from "./player-tag";

type Row = MatchupSkillRow & {
  opponent_tag?: string;
  battle_time: string;
  prediction_training_cutoff?: string | null;
};

/** Input is the friend's history. Reverse outcomes/probabilities to the owner's perspective. */
export function summarizeRivalryAdvantage(
  rows: Row[],
  ownerTag: string | undefined,
  version: string | null,
) {
  const owner = normalizePlayerTag(ownerTag ?? "");
  const seen = new Set<string>();
  const direct = owner
    ? rows
        .filter((row) => {
          if (
            normalizePlayerTag(row.opponent_tag ?? "") !== owner ||
            !SKILL_MODES.has(row.mode) ||
            !Number.isFinite(Date.parse(row.battle_time)) ||
            !row.physical_match_id ||
            seen.has(row.physical_match_id)
          )
            return false;
          if (!["win", "loss", "draw"].includes(row.friend_result))
            return false;
          seen.add(row.physical_match_id);
          return true;
        })
        .map((row) => ({
          ...row,
          friend_result: (row.friend_result === "win"
            ? "loss"
            : row.friend_result === "loss"
              ? "win"
              : "draw") as Row["friend_result"],
          expected_win_probability:
            typeof row.expected_win_probability === "number"
              ? 1 - row.expected_win_probability
              : null,
          prediction_eligible:
            row.prediction_eligible === true &&
            Number.isFinite(Date.parse(row.prediction_training_cutoff ?? "")) &&
            Date.parse(row.battle_time) >
              Date.parse(row.prediction_training_cutoff!),
        }))
    : [];
  const skill = summarizeMatchupSkill(direct, version);
  const edge = skill.scoredMatches
    ? skill.winsAboveExpected / skill.scoredMatches
    : 0;
  const deckEdge = skill.scoredMatches
    ? skill.expectedWins / skill.scoredMatches - 0.5
    : 0;
  return {
    ownerKnown: Boolean(owner),
    wins: skill.recordWins,
    losses: skill.recordLosses,
    draws: direct.filter((row) => row.friend_result === "draw").length,
    scoredMatches: skill.scoredMatches,
    actualWins: skill.actualWins,
    expectedWins: skill.expectedWins,
    winsAboveExpected: skill.winsAboveExpected,
    performanceEdge:
      skill.scoredMatches < 10
        ? "insufficient"
        : Math.abs(edge) < 0.05
          ? "even"
          : edge > 0
            ? "you"
            : "friend",
    deckAdvantage: !skill.scoredMatches
      ? "unavailable"
      : Math.abs(deckEdge) < 0.05
        ? "even"
        : deckEdge > 0
          ? "you"
          : "friend",
    provisional: skill.provisional,
    firstMatch: direct.length
      ? direct.map((row) => row.battle_time).sort()[0]
      : null,
    lastMatch: direct.length
      ? direct
          .map((row) => row.battle_time)
          .sort()
          .at(-1)!
      : null,
    retentionLimitReached: rows.length >= FRIEND_HISTORY_LIMIT,
  };
}

export type RivalryAdvantage = ReturnType<typeof summarizeRivalryAdvantage>;
