import { fireEvent, render, screen, within } from '@testing-library/react';
import VisualDeckForm from './VisualDeckForm';
import type { CatalogTower, CatalogVariant, Deck } from './types';

const variants: CatalogVariant[] = [
  { key: '1:0', card_id: 1, form: 0, name: 'Archer Queen', min_level: 9 },
  { key: '1:2', card_id: 1, form: 2, name: 'Hero Archer Queen', base_name: 'Archer Queen', min_level: 11 },
  { key: '2:0', card_id: 2, form: 0, name: 'Hog Rider', min_level: 1 },
  { key: '3:0', card_id: 3, form: 0, name: 'Fireball', min_level: 1 },
];
const towers: CatalogTower[] = [{ id: 10, name: 'Tower Princess' }, { id: 11, name: 'Cannoneer' }];
const initial: Deck = { cards: [{ key: '1:0', level: 14 }, ...Array.from({ length: 7 }, () => ({ key: '', level: 16 }))], tower_id: 10, tower_level: 14 };

describe('VisualDeckForm', () => {
  it('replaces and removes a slot through the visual picker', () => {
    const onChange = jest.fn();
    const { rerender } = render(<VisualDeckForm deck={initial} variants={variants} towers={towers} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Card 1: Archer Queen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Hog Rider' }));
    const replacement = onChange.mock.calls.at(-1)?.[0] as Deck;
    expect(replacement.cards[0]).toEqual({ key: '2:0', level: 14 });

    rerender(<VisualDeckForm deck={replacement} variants={variants} towers={towers} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Card 1: Hog Rider' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove card from slot' }));
    expect((onChange.mock.calls.at(-1)?.[0] as Deck).cards[0]).toEqual({ key: '', level: 16 });
  });

  it('keeps level and tower controls collapsed, then applies the all-level preset', () => {
    const onChange = jest.fn();
    render(<VisualDeckForm deck={initial} variants={variants} towers={towers} onChange={onChange} />);
    expect(screen.queryByText('Card levels')).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Tower troop' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show levels & tower' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set all to 11' }));
    const updated = onChange.mock.calls.at(-1)?.[0] as Deck;
    expect(updated.cards[0].level).toBe(11);
    expect(updated.tower_level).toBe(11);
    expect(within(screen.getByRole('group', { name: 'Deck card slots' })).getByRole('button', { name: 'Card 1: Archer Queen' })).toBeTruthy();
  });
});
