import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FriendDeckPageExperience from './FriendDeckPageExperience';
import { counter } from './model-tools/api';

jest.mock('./model-tools/api', () => ({ counter: jest.fn() }));
jest.mock('@/lib/browser-auth-headers', () => ({ browserAuthHeaders: async () => ({}) }));
const usage = { key: 'one', count: 10, share: 1, cards: Array.from({ length: 8 }, (_, i) => ({ id: String(26000000 + i), form: '0', level: 14 })), tower: '159000000', towerLevel: 14 };
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ friend: { friend_name: 'Alex', friend_player_tag: '#P0YQ' }, summary: { recordedMatches: 10, allTimeMatches: 10, topDecks: [usage] } }) });
  jest.mocked(counter).mockResolvedValue({ candidates: [] });
});
it('loads rivalry history without spending a counter request until explicitly requested', async () => {
  render(<FriendDeckPageExperience friendId="friend-a" />);
  const button = await screen.findByRole('button', { name: 'Find counter for selected deck' });
  expect(counter).not.toHaveBeenCalled();
  fireEvent.click(button);
  await waitFor(() => expect(counter).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('link', { name: 'Prepare a rematch' })).toHaveAttribute('href', '/counter-deck?friendId=friend-a&rematch=1');
});
it('aborts a pending counter when changing subjects', async () => {
  jest.mocked(counter).mockReturnValue(new Promise(() => {}));
  const view = render(<FriendDeckPageExperience friendId="friend-a" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Find counter for selected deck' }));
  await waitFor(() => expect(counter).toHaveBeenCalledTimes(1));
  const signal = jest.mocked(counter).mock.calls[0][5];
  view.rerender(<FriendDeckPageExperience friendId="friend-b" />);
  expect(signal?.aborted).toBe(true);
});
