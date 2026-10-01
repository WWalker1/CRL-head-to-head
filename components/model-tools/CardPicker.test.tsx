import { fireEvent, render, screen } from '@testing-library/react';
import CardPicker from './CardPicker';
import type { CatalogVariant } from './types';

const variants: CatalogVariant[] = [
  { key: '1:0', card_id: 1, form: 0, name: 'Archer Queen', base_name: 'Archer Queen' },
  { key: '1:2', card_id: 1, form: 2, name: 'Hero Archer Queen', base_name: 'Archer Queen' },
  { key: '2:0', card_id: 2, form: 0, name: 'Hog Rider', base_name: 'Hog Rider' },
  { key: '2:1', card_id: 2, form: 1, name: 'Evolution Hog Rider', base_name: 'Hog Rider' },
];

describe('CardPicker', () => {
  it('searches cards, filters forms, and disables a duplicate base card', () => {
    render(<CardPicker open title="Choose card 2" variants={variants} selectedKeys={['1:0']} onSelect={jest.fn()} onClose={jest.fn()} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search cards' }), { target: { value: 'hog' } });
    expect(screen.getByRole('button', { name: 'Select Hog Rider' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Select Archer Queen' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Evolution' }));
    expect(screen.getByRole('button', { name: 'Select Evolution Hog Rider' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Select Hog Rider' })).toBeNull();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search cards' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect((screen.getByRole('button', { name: 'Select Hero Archer Queen' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
