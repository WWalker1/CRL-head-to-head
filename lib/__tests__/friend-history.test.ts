import { canonicalDeck, deckIdentity, isEligibleMode, normalizeBattle, physicalMatchId, summarizeFriendHistory } from '../friend-history';

const cards = Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), form: i === 0 ? 'evo' : null }));
const log = (id: string, mode = 'ladder', tower = 'princess') => ({ physical_match_id: id, battle_time: `2026-09-${String(Number(id) + 1).padStart(2, '0')}T00:00:00.000Z`, mode, friend_result: 'win' as const, friend_deck: { cards, tower } });

describe('friend history summaries', () => {
  it('allows only supported modes and canonicalizes card order', () => {
    expect(isEligibleMode('ladder')).toBe(true);
    expect(isEligibleMode('draft')).toBe(false);
    expect(canonicalDeck({ cards: [...cards].reverse(), tower: 'princess' }).cards[0].id).toBe('1');
    expect(deckIdentity({ cards, tower: 'princess' })).toEqual(deckIdentity({ cards: cards.map(card => ({ ...card, level: 99 })), tower: 'princess' }));
  });

  it('normalizes only a reviewed constructed battle and is reversal stable', () => {
    const apiCards = cards.map(card => ({ ...card, rarity: 'common', level: 16 }));
    const battle: any = { type: 'pathOfLegend', battleTime: '20260921T000000.000Z', gameMode: { id: 72000464 }, deckSelection: 'collection', team: [{ tag: '#FRIEND', crowns: 1, cards: apiCards, supportCards: [{ id: 159000000, rarity: 'common', level: 16 }] }], opponent: [{ tag: '#OTHER', crowns: 0, cards: apiCards, supportCards: [{ id: 159000000, rarity: 'common', level: 16 }] }] };
    const normalized = normalizeBattle(battle, '#FRIEND');
    expect(normalized?.friend_result).toBe('win');
    expect(normalized?.physical_match_id).toBe(physicalMatchId(battle.battleTime, ['#FRIEND', '#OTHER'], 'pathOfLegend', 72000464));
    expect(normalizeBattle({ ...battle, gameMode: { id: 72000042 } }, '#FRIEND')).toBeNull();
    expect(normalizeBattle({ ...battle, modifiers: ['x'] }, '#FRIEND')).toBeNull();
  });

  it('counts exact deck variants and keeps only the latest 100 eligible rows', () => {
    const rows = [...Array.from({ length: 101 }, (_, i) => log(String(i))), log('200', 'draft')];
    const summary = summarizeFriendHistory(rows);
    expect(summary.eligibleMatches).toBe(100);
    expect(summary.topDecks[0].count).toBe(100);
    expect(summary.coverage).toBe(100 / 100);
  });
});
