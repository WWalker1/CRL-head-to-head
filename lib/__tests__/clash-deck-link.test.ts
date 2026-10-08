import { buildClashDeckLink, CLASH_DECK_IMPORT_NOTICE } from '../clash-deck-link';

const cards = [
  '26000021:0', '26000014:1', '28000000:0', '26000030:0',
  '26000000:2', '27000000:0', '28000008:0', '26000010:0',
].map((key) => ({ key, level: 16 }));

describe('buildClashDeckLink', () => {
  it('exports eight base card IDs in deck order without claiming forms or tower support', () => {
    expect(buildClashDeckLink({ cards, tower_id: 159000000 })).toBe(
      'https://link.clashroyale.com/deck/en?deck=26000021;26000014;28000000;26000030;26000000;27000000;28000008;26000010'
    );
    expect(CLASH_DECK_IMPORT_NOTICE).toMatch(/Evolution.*Hero.*tower.*levels/i);
  });

  it('requires exactly eight cards', () => {
    expect(() => buildClashDeckLink({ cards: cards.slice(0, 7) })).toThrow(/exactly eight/i);
  });

  it('rejects duplicate base IDs even when forms differ', () => {
    expect(() => buildClashDeckLink({ cards: [...cards.slice(0, 7), { key: '26000014:0' }] })).toThrow(/duplicate/i);
  });

  it.each(['26000021', 'abc:0', '26000021:3', '26000021:0;evil', '-1:0'])('rejects invalid key %s', (key) => {
    expect(() => buildClashDeckLink({ cards: [{ key }, ...cards.slice(1)] })).toThrow(/invalid/i);
  });
});
