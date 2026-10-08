import { render, screen } from '@testing-library/react';
import FriendInsights from './FriendInsights';

describe('Friend deck navigation', () => {
  it('links directly to the selected friend’s deck and counter page', () => {
    render(<FriendInsights friendId="friend-1" friendName="Alex" />);
    const link = screen.getByRole('link', { name: /Alex's most-played decks and counters/i });
    expect(link.getAttribute('href')).toBe('/friend-decks/friend-1');
  });
});
