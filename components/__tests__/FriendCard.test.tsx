import { fireEvent, render, screen } from '@testing-library/react';
import FriendCard from '../FriendCard';

it('announces wins and losses without relying on color and preserves removal', () => {
  const onRemove = jest.fn();
  render(<FriendCard friend={{ id: 'friend-1', user_id: 'owner-1', friend_name: 'Example', friend_player_tag: '#EXAMPLE', total_wins: 1, total_losses: 0, created_at: '', updated_at: '' }} onRemove={onRemove} />);
  expect(screen.getByRole('img', { name: '1 win and 0 losses' })).toHaveTextContent('1–0');
  fireEvent.click(screen.getByRole('button', { name: 'Remove friend' }));
  expect(onRemove).toHaveBeenCalledWith('friend-1');
});
