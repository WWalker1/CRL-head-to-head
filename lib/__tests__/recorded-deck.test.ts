import { recordedDeck } from '../recorded-deck';

const deck = { cards: Array.from({ length: 8 }, (_, i) => ({ id: String(26000000 + i), form: i === 0 ? '1' : '0', level: 14 })), tower: '159000000', towerLevel: 14 };
it('preserves all recorded forms, levels and tower for a rematch', () => {
  expect(recordedDeck(deck)).toMatchObject({ cards: [expect.objectContaining({ key: '26000000:1', level: 14 }), ...Array.from({ length: 7 }, () => expect.objectContaining({ level: 14 }))], tower_id: 159000000, tower_level: 14 });
});
it('rejects incomplete, duplicate and unsupported recorded decks rather than inventing defaults', () => {
  for (const candidate of [null, { ...deck, tower: null }, { ...deck, towerLevel: null }, { ...deck, cards: deck.cards.slice(1) }, { ...deck, cards: deck.cards.map(() => deck.cards[0]) }, { ...deck, cards: deck.cards.map(card => ({ ...card, level: null })) }, { ...deck, cards: deck.cards.map(card => ({ ...card, form: '9' })) }]) expect(recordedDeck(candidate)).toBeNull();
});
