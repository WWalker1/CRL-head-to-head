import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RivalryShareControl from './RivalryShareControl';

describe('RivalryShareControl', () => {
  beforeEach(() => { Object.defineProperty(global, 'fetch', { configurable: true, writable: true, value: jest.fn() }); });
  afterEach(() => { Reflect.deleteProperty(global, 'fetch'); });

  it('creates an optional public snapshot and copies its link', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ shareId: 'safe-share-id', shareUrl: 'https://beta.rival-royale.com/rivalry/safe-share-id' }),
    } as Response).mockResolvedValueOnce({ ok: true, json: async () => ({ revoked: true }) } as Response);
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

    render(<RivalryShareControl friendId="friend-1" friendName="Alex" />);
    fireEvent.click(screen.getByLabelText(/include the friend’s most-played decks/i));
    fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

    await screen.findByLabelText(/public share link/i);
    expect(fetchMock).toHaveBeenCalledWith('/api/rivalry-shares', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ friendId: 'friend-1', includeDecks: true }),
    }));
    const input = screen.getByLabelText(/public share link/i) as HTMLInputElement;
    expect(input.value).toBe('https://beta.rival-royale.com/rivalry/safe-share-id');

    fireEvent.click(screen.getByRole('button', { name: /copy link/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(input.value));
    expect(await screen.findByRole('status')).toHaveTextContent(/link copied/i);

    fireEvent.click(screen.getByRole('button', { name: /revoke link/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('/api/rivalry-shares?shareId=safe-share-id', expect.objectContaining({ method: 'DELETE' })));
    expect(await screen.findByRole('status')).toHaveTextContent(/share link revoked/i);
    expect(screen.queryByLabelText(/public share link/i)).toBeNull();
  });

  it('shows the server error without exposing an unusable link', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Sharing unavailable' }),
    } as Response);
    render(<RivalryShareControl friendId="friend-1" friendName="Alex" />);
    fireEvent.click(screen.getByRole('button', { name: /create share link/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sharing unavailable');
    expect(screen.queryByLabelText(/public share link/i)).toBeNull();
  });
});
