import { fireEvent, render, screen } from '@testing-library/react';
import CardArtwork from './CardArtwork';
import { cardDisplay } from '@/lib/card-display';

describe('CardArtwork', () => {
  it('uses bundled card art without calling the model catalog endpoint', () => {
    const card = cardDisplay('26000001:0');
    expect(card.name).toBe('Archers');
    expect(card.image).toContain('api-assets.clashroyale.com');
    render(<CardArtwork cardKey="26000001:0" />);
    expect(screen.getByRole('img', { name: 'Archers' })).toHaveAttribute('src', card.image);
  });

  it('keeps a readable card name when a remote image fails', () => {
    render(<CardArtwork cardKey="26000001:0" />);
    fireEvent.error(screen.getByRole('img', { name: 'Archers' }));
    expect(screen.getByText('Archers')).toBeVisible();
  });

  it('falls back to base art for an unknown form and recorded name for an unknown card', () => {
    expect(cardDisplay('26000001:8').name).toBe('Archers');
    expect(cardDisplay('99999999:0', 'Future Card').name).toBe('Future Card');
  });
});
