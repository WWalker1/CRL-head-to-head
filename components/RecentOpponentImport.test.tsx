import { fireEvent, render, screen } from '@testing-library/react';
import RecentOpponentImport, { supportedImportedDeck } from './RecentOpponentImport';
import { requestPublicSnapshot } from '@/lib/public-snapshot-client';

jest.mock('@/lib/public-snapshot-client', () => ({ requestPublicSnapshot: jest.fn() }));
const cards = Array.from({ length: 8 }, (_, i) => ({ key: `${26000000 + i}:${i === 0 ? 1 : 0}`, level: 14 }));
const deck = { cards, tower_id: 159000000, tower_level: 13 };
const catalog = { variants: cards.map((card, i) => ({ key: card.key, name: `Card ${i}`, min_level: 1 })), towers: [{ id: 159000000, name: 'Tower' }] };

it('imports the exact recorded deck without automatically searching for a counter', async () => {
  const onSelect = jest.fn();
  (requestPublicSnapshot as jest.Mock).mockResolvedValue({ playerTag: '#P0YQ', fetchedAt: '2026-10-22T00:00:00Z', decks: [{ date: '2026-10-21T00:00:00Z', result: 'loss', deck, cardNames: cards.map(card => card.key) }] });
  render(<RecentOpponentImport catalog={catalog} onSelect={onSelect} />);
  fireEvent.change(screen.getByLabelText('Your player tag'), { target: { value: '#P0YQ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find recent opponent decks' }));
  const button = await screen.findByRole('button', { name: 'Use opponent deck 1' });
  expect(onSelect).not.toHaveBeenCalled();
  fireEvent.click(button);
  expect(onSelect).toHaveBeenCalledWith(deck);
});

it('rejects unsupported forms, towers, duplicate base cards and invalid levels', () => {
  expect(supportedImportedDeck(deck, catalog)).toBe(true);
  expect(supportedImportedDeck(deck, { ...catalog, variants: [] })).toBe(false);
  expect(supportedImportedDeck({ ...deck, tower_id: 42 }, catalog)).toBe(false);
  expect(supportedImportedDeck({ ...deck, cards: Array(8).fill(cards[0]) }, catalog)).toBe(false);
  expect(supportedImportedDeck({ ...deck, cards: cards.map(card => ({ ...card, level: 17 })) }, catalog)).toBe(false);
});
