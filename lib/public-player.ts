import { createHash } from 'node:crypto';
import { normalizeBattle, type FriendHistoryLog } from './friend-history';
import { summarizeMatchupSkill } from './matchup-skill';
import { getPlayerBattleLogSnapshot } from './clashRoyaleApi';
import type { PublicPlayerSnapshot, PublicOpponentSnapshot } from './public-player-types';
import { createAsyncCache } from './async-cache';
export { normalizePlayerTag } from './player-tag';

export const PUBLIC_PLAYER_LIMIT = 25;
const CACHE_MS = 5 * 60 * 1000;
const CACHE_LIMIT = 100;

const battleCache = createAsyncCache<{ battles: unknown[]; fetchedAt: string }>(CACHE_MS, CACHE_LIMIT);
const snapshotCache = createAsyncCache<PublicPlayerSnapshot>(CACHE_MS, CACHE_LIMIT, value => value.status !== 'model_unavailable', value => Date.parse(value.fetchedAt) + CACHE_MS);
function readPublicBattles(tag: string) {
  return battleCache(tag, async () => ({ battles: await getPlayerBattleLogSnapshot(tag), fetchedAt: new Date(Date.now()).toISOString() }));
}

/** Same eligibility/physical-match rules as tracking, with no account/archive access. */
export function publicSnapshotRows(battles: unknown[], tag: string): FriendHistoryLog[] {
  const unique = new Map<string, FriendHistoryLog>();
  for (const battle of battles.slice(0, 50)) {
    const row = normalizeBattle(battle, tag);
    if (row && row.friend_result !== 'draw') unique.set(row.physical_match_id, row);
  }
  return [...unique.values()].sort((a, b) => Date.parse(b.battle_time) - Date.parse(a.battle_time)).slice(0, PUBLIC_PLAYER_LIMIT);
}

function modelDeck(deck: FriendHistoryLog['friend_deck'] | null | undefined) {
  if (!deck || deck.cards.length !== 8 || !/^\d+$/.test(deck.tower ?? '') || !Number.isInteger(deck.towerLevel)) return null;
  const cards = deck.cards.map(card => ({ key: `${card.id}:${card.form ?? '0'}`, level: card.level }));
  if (cards.some(card => !/^\d+:[012]$/.test(card.key) || !Number.isInteger(card.level) || card.level! < 1 || card.level! > 16)) return null;
  if (new Set(cards.map(card => card.key.split(':')[0])).size !== 8 || deck.towerLevel! < 1 || deck.towerLevel! > 16) return null;
  return { cards, tower_id: Number(deck.tower), tower_level: deck.towerLevel };
}

type ScoredRow = FriendHistoryLog & { expected_win_probability?: number; prediction_model_version?: string; prediction_eligible?: boolean };

async function fetchSnapshot(tag: string): Promise<PublicPlayerSnapshot> {
  const { battles, fetchedAt } = await readPublicBattles(tag);
  const rows: ScoredRow[] = publicSnapshotRows(battles, tag);
  const service = process.env.MODEL_SERVICE_URL?.replace(/\/$/, '');
  const token = process.env.MODEL_SERVICE_TOKEN;
  let version: string | null = null;
  let comparisonKey: string | null = null;
  let status: PublicPlayerSnapshot['status'] = rows.length ? 'model_unavailable' : 'no_supported_games';
  if (rows.length && process.env.MODEL_TOOLS_ENABLED === '1' && service && token) {
    try {
      const ready = await fetch(`${service}/ready`, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
      if (!ready.ok) throw new Error('not ready');
      const metadata = await ready.json();
      if (typeof metadata.model_version !== 'string' || !Number.isFinite(Date.parse(metadata.training_cutoff))) throw new Error('invalid metadata');
      const matches = rows.flatMap(row => {
        if (Date.parse(row.battle_time) <= Date.parse(metadata.training_cutoff)) return [];
        const a = modelDeck(row.friend_deck);
        const b = modelDeck(row.opponent_deck);
        return a && b ? [{ id: row.physical_match_id, decks: [a, b] }] : [];
      });
      if (matches.length) {
        const response = await fetch(`${service}/score-history`, {
          method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(4000),
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({ matches }),
        });
        if (!response.ok) throw new Error('scoring unavailable');
        const result = await response.json();
        if (result.model_version !== metadata.model_version || result.training_cutoff !== metadata.training_cutoff || !Array.isArray(result.scores)) throw new Error('model changed');
        const requested = new Set(matches.map(match => match.id));
        const scores = new Map<string, number>();
        for (const score of result.scores.slice(0, PUBLIC_PLAYER_LIMIT)) {
          if (requested.has(score?.id) && typeof score.probability === 'number' && Number.isFinite(score.probability) && score.probability >= 0 && score.probability <= 1) scores.set(score.id, score.probability);
        }
        for (const row of rows) {
          const probability = scores.get(row.physical_match_id);
          if (probability !== undefined) Object.assign(row, { expected_win_probability: probability, prediction_model_version: metadata.model_version, prediction_eligible: true });
        }
      }
      version = metadata.model_version;
      comparisonKey = createHash('sha256').update(JSON.stringify([metadata.model_version, metadata.training_cutoff, 'matchup-skill-v1'])).digest('hex').slice(0, 24);
      status = 'no_supported_games';
    } catch {
      // A partial/model failure must never turn a record into a fabricated skill score.
      status = 'model_unavailable';
    }
  }
  const skill = summarizeMatchupSkill(rows, version);
  if (skill.scoredMatches) status = 'ready';
  const scored = rows.filter(row => row.prediction_eligible && row.prediction_model_version === version);
  const win = scored.filter(row => row.friend_result === 'win').sort((a, b) => a.expected_win_probability! - b.expected_win_probability!)[0];
  const loss = scored.filter(row => row.friend_result === 'loss').sort((a, b) => b.expected_win_probability! - a.expected_win_probability!)[0];
  return {
    playerTag: tag, fetchedAt,
    comparisonKey: skill.scoredMatches ? comparisonKey : null,
    scoredFirstMatch: scored.at(-1)?.battle_time ?? null,
    scoredLastMatch: scored[0]?.battle_time ?? null,
    firstMatch: rows.at(-1)?.battle_time ?? null, lastMatch: rows[0]?.battle_time ?? null,
    availableGames: battles.length, eligibleGames: rows.length, scoredGames: skill.scoredMatches,
    wins: skill.recordWins, losses: skill.recordLosses, score: skill.score,
    expectedWins: skill.expectedWins, winsAboveExpected: skill.winsAboveExpected, provisional: skill.provisional, status,
    highlights: [win, loss].filter((row): row is ScoredRow => Boolean(row)).map(row => ({
      date: row.battle_time, result: row.friend_result as 'win' | 'loss', expectedWinProbability: row.expected_win_probability!,
      cards: row.friend_deck.cards.map(card => ({ id: card.id, name: card.name ?? null, form: card.form ?? '0' })),
    })),
  };
}

export function readPublicPlayerSnapshot(tag: string): Promise<PublicPlayerSnapshot> {
  return snapshotCache(tag, () => fetchSnapshot(tag));
}

/** Complete public opponent decks only; no identity, archive read or inference. */
export async function readPublicOpponentSnapshot(tag: string): Promise<PublicOpponentSnapshot> {
  const { battles, fetchedAt } = await readPublicBattles(tag);
  const decks = publicSnapshotRows(battles, tag).flatMap(row => {
    const deck = modelDeck(row.opponent_deck);
    return deck ? [{ date: row.battle_time, result: row.friend_result as 'win' | 'loss',
      deck: { ...deck, cards: deck.cards.map(card => ({ ...card, level: card.level! })), tower_level: deck.tower_level! },
      cardNames: row.opponent_deck!.cards.map(card => card.name || String(card.id)) }] : [];
  }).slice(0, 5);
  return { playerTag: tag, fetchedAt, decks };
}
