import { createHash } from 'crypto';

export const FRIEND_HISTORY_LIMIT = 100;
/** Reviewed constructed 1v1 mode IDs. Unknown events are excluded by default. */
export const ELIGIBLE_MODE_IDS = new Set([72000006, 72000464, 72000450]);
export const ELIGIBLE_MODES = ['ladder', 'ranked'] as const;
export type EligibleMode = (typeof ELIGIBLE_MODES)[number];

export interface DeckCard { id: string; name?: string | null; form?: string | null; level?: number | null }
export interface FriendHistoryLog {
  physical_match_id: string;
  battle_time: string;
  mode: string;
  friend_result: 'win' | 'loss' | 'draw';
  friend_deck: { cards: DeckCard[]; tower?: string | null; towerLevel?: number | null };
  opponent_deck?: { cards: DeckCard[]; tower?: string | null; towerLevel?: number | null } | null;
}
export interface DeckUsage { key: string; cards: DeckCard[]; tower: string | null; towerLevel: number | null; count: number; share: number }
export interface FriendHistorySummary {
  matches: number;
  eligibleMatches: number;
  /** Fraction of recorded rows represented by the displayed top three decks. */
  coverage: number;
  recordedMatches: number;
  firstObserved: string | null;
  lastObserved: string | null;
  topDecks: DeckUsage[];
}

export function physicalMatchId(battleTime: string, participants: string[], type: string, modeId: number | string) {
  return createHash('sha256').update(JSON.stringify([battleTime, [...participants].sort(), type, Number(modeId)])).digest('hex');
}

export function isEligibleMode(mode: unknown): mode is EligibleMode {
  return typeof mode === 'string' && (ELIGIBLE_MODES as readonly string[]).includes(mode);
}

export function canonicalDeck(deck: FriendHistoryLog['friend_deck']) {
  const cards = [...(deck?.cards || [])].map(c => ({ id: String(c.id), name: c.name ?? null, form: c.form ?? null, level: c.level ?? null }))
    .sort((a, b) => `${a.id}:${a.form || ''}`.localeCompare(`${b.id}:${b.form || ''}`));
  return { cards, tower: deck?.tower ?? null, towerLevel: deck?.towerLevel ?? null };
}

/** Deck identity deliberately ignores levels; the retained deck keeps latest observed levels. */
export function deckIdentity(deck: FriendHistoryLog['friend_deck']) {
  return { cards: [...(deck?.cards || [])].map(c => ({ id: String(c.id), form: c.form ?? null }))
    .sort((a, b) => `${a.id}:${a.form || ''}`.localeCompare(`${b.id}:${b.form || ''}`)), tower: deck?.tower ?? null };
}

export function summarizeFriendHistory(rows: FriendHistoryLog[]): FriendHistorySummary {
  const eligible = rows.filter(row => isEligibleMode(row.mode)).sort((a, b) => +new Date(b.battle_time) - +new Date(a.battle_time));
  const counts = new Map<string, DeckUsage>();
  for (const row of eligible.slice(0, FRIEND_HISTORY_LIMIT)) {
    const deck = canonicalDeck(row.friend_deck);
    const key = JSON.stringify(deckIdentity(deck));
    const current = counts.get(key);
    if (current) current.count += 1;
    else counts.set(key, { key, cards: deck.cards, tower: deck.tower, towerLevel: deck.towerLevel, count: 1, share: 0 });
  }
  const total = eligible.slice(0, FRIEND_HISTORY_LIMIT).length;
  const topDecks = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 3)
    .map(deck => ({ ...deck, share: total ? deck.count / total : 0 }));
  const topThreeCount = topDecks.reduce((sum, deck) => sum + deck.count, 0);
  return {
    matches: rows.length,
    eligibleMatches: total,
    coverage: total ? topThreeCount / total : 0,
    recordedMatches: total,
    firstObserved: eligible.length ? eligible[eligible.length - 1].battle_time : null,
    lastObserved: eligible.length ? eligible[0].battle_time : null,
    topDecks,
  };
}

function parseBattleTime(value: string) {
  const match = /^(\d{8})T(\d{6})(?:\.(\d+))?Z$/.exec(value);
  if (match) return new Date(`${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}T${match[2].slice(0, 2)}:${match[2].slice(2, 4)}:${match[2].slice(4, 6)}.${(match[3] || '0').padEnd(3, '0')}Z`);
  return new Date(value);
}

/** Convert one authoritative RoyaleAPI battle into a friend history row. */
export function normalizeBattle(battle: any, friendTag: string): FriendHistoryLog | null {
  const modeId = Number(battle.gameMode?.id);
  if (!((battle.type === 'PvP' && modeId === 72000006) || (battle.type === 'pathOfLegend' && [72000464, 72000450].includes(modeId))) || battle.modifiers || battle.isHostedMatch || battle.isLadderTournament || battle.deckSelection !== 'collection') return null;
  if (!Array.isArray(battle.team) || !Array.isArray(battle.opponent) || battle.team.length !== 1 || battle.opponent.length !== 1) return null;
  const friendSide = [...battle.team, ...battle.opponent].find(player => player.tag === friendTag);
  const opponentSide = battle.team[0].tag === friendTag ? battle.opponent[0] : battle.team[0];
  if (!friendSide || !opponentSide || !Array.isArray(friendSide.cards) || !Array.isArray(opponentSide.cards)) return null;
  const offsets: Record<string, number> = { common: 0, rare: 2, epic: 5, legendary: 8, champion: 10 };
  const validCards = (cards: any[]) => cards.length === 8 && new Set(cards.map(card => card?.id)).size === 8 && cards.every(card => Number.isFinite(Number(card?.id)) && !card?.modifier && offsets[card?.rarity] !== undefined && Number.isInteger(card?.level) && card.level >= 1 && card.level + offsets[card.rarity] <= 16 && Number.isInteger(card?.evolutionLevel ?? 0) && [0, 1, 2, 3].includes(card?.evolutionLevel ?? 0));
  if (!validCards(friendSide.cards) || !validCards(opponentSide.cards)) return null;
  const validTower = (player: any) => Array.isArray(player.supportCards) && player.supportCards.length === 1 && offsets[player.supportCards[0]?.rarity] !== undefined && Number.isInteger(player.supportCards[0]?.level) && player.supportCards[0].level >= 1 && player.supportCards[0].level + offsets[player.supportCards[0].rarity] <= 16;
  if (!validTower(friendSide) || !validTower(opponentSide)) return null;
  const parsedTime = parseBattleTime(battle.battleTime);
  if (Number.isNaN(parsedTime.getTime())) return null;
  const mapDeck = (player: any) => canonicalDeck({ cards: player.cards.map((card: any) => ({ id: String(card.id), name: card.name || null, form: String(card.evolutionLevel ?? 0), level: card.level + offsets[card.rarity] })), tower: String(player.supportCards[0].id), towerLevel: player.supportCards[0].level + offsets[player.supportCards[0].rarity] });
  const participants = [battle.team[0].tag, battle.opponent[0].tag];
  const friendCrowns = Number(friendSide.crowns || 0); const opponentCrowns = Number(opponentSide.crowns || 0);
  return { physical_match_id: physicalMatchId(battle.battleTime, participants, battle.type, modeId), battle_time: parsedTime.toISOString(), mode: modeId === 72000006 ? 'ladder' : 'ranked', friend_result: friendCrowns === opponentCrowns ? 'draw' : friendCrowns > opponentCrowns ? 'win' : 'loss', friend_deck: mapDeck(friendSide), opponent_deck: mapDeck(opponentSide) };
}

export function normalizeLog(input: any): FriendHistoryLog | null {
  if (!input || typeof input.physical_match_id !== 'string' || !input.physical_match_id.trim() ||
      !input.battle_time || !isEligibleMode(input.mode) || !['win', 'loss', 'draw'].includes(input.friend_result) ||
      !Array.isArray(input.friend_deck?.cards) || input.friend_deck.cards.length !== 8) return null;
  const parsedTime = new Date(input.battle_time);
  if (Number.isNaN(parsedTime.getTime())) return null;
  return { physical_match_id: input.physical_match_id.trim(), battle_time: parsedTime.toISOString(), mode: input.mode,
    friend_result: input.friend_result, friend_deck: canonicalDeck(input.friend_deck), opponent_deck: input.opponent_deck || null };
}
