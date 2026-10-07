import { canonicalDeck, deckIdentity, isEligibleMode, normalizeBattle, physicalMatchId, summarizeFriendHistory } from '../friend-history';

const cards = Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), form: i === 0 ? 'evo' : null }));
const log = (id: string, mode = 'ladder', tower = 'princess') => ({ physical_match_id: id, battle_time: `2026-09-${String(Number(id) + 1).padStart(2, '0')}T00:00:00.000Z`, mode, friend_result: 'win' as const, friend_deck: { cards, tower } });

describe('friend history summaries', () => {
  it('allows only supported modes and canonicalizes card order', () => {
    expect(isEligibleMode('ladder')).toBe(true);
    expect(isEligibleMode('ranked')).toBe(true);
    expect(isEligibleMode('challenge')).toBe(true);
    expect(isEligibleMode('draft')).toBe(false);
    expect(canonicalDeck({ cards: [...cards].reverse(), tower: 'princess' }).cards[0].id).toBe('1');
    expect(deckIdentity({ cards, tower: 'princess' })).toEqual(deckIdentity({ cards: cards.map(card => ({ ...card, level: 99 })), tower: 'princess' }));
  });

  it('normalizes the standard trail ladder battle and is reversal stable', () => {
    const apiCards = cards.map(card => ({ ...card, rarity: 'common', level: 16 }));
    const battle: any = { type: 'trail', battleTime: '20260921T000000.000Z', gameMode: { id: 72000006, name: 'Ladder' }, deckSelection: 'collection', team: [{ tag: '#FRIEND', crowns: 1, cards: apiCards, supportCards: [{ id: 159000000, rarity: 'common', level: 16 }] }], opponent: [{ tag: '#OTHER', crowns: 0, cards: apiCards, supportCards: [{ id: 159000000, rarity: 'common', level: 16 }] }] };
    const normalized = normalizeBattle(battle, '#FRIEND');
    expect(normalized?.friend_result).toBe('win');
    expect(normalized?.mode).toBe('ladder');
    expect(normalized?.physical_match_id).toBe(physicalMatchId(battle.battleTime, ['#FRIEND', '#OTHER'], 'trail', 72000006));
    expect(normalizeBattle({ ...battle, gameMode: { id: 72000042 } }, '#FRIEND')?.mode).toBe('other');
    expect(normalizeBattle({ ...battle, modifiers: [{ id: 'x' }] }, '#FRIEND')).toBeNull();
  });

  it.each(['classic', 'grand'])('accepts constructed %s challenge games', challengeType => {
    const apiCards = cards.map(card => ({ ...card, rarity: 'common', level: 16 }));
    const battle: any = {
      type: 'trail', challengeType, battleTime: '20260921T000000.000Z', eventTag: `classic-grand-${challengeType}`,
      gameMode: { id: 72000474, name: 'Challenge_AllCards_EventDeck_NoSet' }, deckSelection: 'eventDeck',
      team: [{ tag: '#FRIEND', crowns: 1, cards: apiCards, supportCards: [{ id: 159000000, rarity: 'common', level: 16 }] }],
      opponent: [{ tag: '#OTHER', crowns: 0, cards: apiCards, supportCards: [{ id: 159000000, rarity: 'common', level: 16 }] },],
    };
    const normalized = normalizeBattle(battle, '#FRIEND');
    expect(normalized).toMatchObject({ mode: 'challenge', battle_type: 'trail', friend_result: 'win' });
    expect(normalized?.physical_match_id).toBe(physicalMatchId(battle.battleTime, ['#FRIEND', '#OTHER'], 'trail', 72000474));
  });

  it('rejects challenge records that do not represent constructed one on one games', () => {
    const apiCards = cards.map(card => ({ ...card, rarity: 'common', level: 16 }));
    const battle: any = {
      type: 'trail', challengeType: 'classic', battleTime: '20260921T000000.000Z', eventTag: 'classic-challenge',
      gameMode: { id: 72000474, name: 'Challenge_AllCards_EventDeck_NoSet' }, deckSelection: 'eventDeck',
      team: [{ tag: '#FRIEND', crowns: 1, cards: apiCards, supportCards: [{ id: 159000000, rarity: 'common', level: 16 }] }],
      opponent: [{ tag: '#OTHER', crowns: 0, cards: apiCards, supportCards: [{ id: 159000000, rarity: 'common', level: 16 }] }],
    };
    expect(normalizeBattle({ ...battle, challengeType: 'draft' }, '#FRIEND')).toBeNull();
    expect(normalizeBattle({ ...battle, deckSelection: 'pick' }, '#FRIEND')).toBeNull();
    expect(normalizeBattle({ ...battle, gameMode: { id: 72000042, name: 'Draft' } }, '#FRIEND')).toBeNull();
    expect(normalizeBattle({ ...battle, modifiers: [{ id: 1 }] }, '#FRIEND')).toBeNull();
    expect(normalizeBattle({ ...battle, opponent: [battle.opponent[0], { ...battle.opponent[0], tag: '#OTHER2' }] }, '#FRIEND')).toBeNull();
  });

  it('counts exact deck variants and keeps only the latest 100 eligible rows', () => {
    const rows = Array.from({ length: 101 }, (_, i) => ({
      ...log(String(i)),
      battle_time: new Date(Date.UTC(2026, 8, 1, 0, i)).toISOString(),
      friend_deck: { cards: i === 0 ? cards.map(card => ({ ...card, id: 'oldest-' + card.id })) : cards, tower: 'princess' },
    })).concat(log('200', 'draft'));
    const summary = summarizeFriendHistory(rows);
    expect(summary.eligibleMatches).toBe(100);
    expect(summary.topDecks[0].count).toBe(100);
    expect(summary.coverage).toBe(100 / 100);
    expect(summary.firstObserved).toBe(new Date(Date.UTC(2026, 8, 1, 0, 1)).toISOString());
    expect(summary.topDecks.some(deck => deck.cards[0].id.startsWith('oldest-'))).toBe(false);
  });

  it('keeps at most five deck variants in the recent-row fallback summary', () => {
    const rows = Array.from({ length: 6 }, (_, index) => ({
      ...log(String(index)),
      battle_time: new Date(Date.UTC(2026, 8, 1, 0, index)).toISOString(),
      friend_deck: { cards: cards.map(card => ({ ...card, id: `${index}-${card.id}` })), tower: 'princess' },
    }));
    const summary = summarizeFriendHistory(rows);

    expect(summary.topDecks).toHaveLength(5);
    expect(summary.topDecks.reduce((sum, deck) => sum + deck.count, 0)).toBe(5);
    expect(summary.coverage).toBe(5 / 6);
  });
});
