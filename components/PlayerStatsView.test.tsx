import { render, screen } from '@testing-library/react';
import PlayerStatsView from './PlayerStatsView';

jest.mock('@/lib/browser-auth-headers', () => ({ browserAuthHeaders: jest.fn(async () => ({ authorization: 'Bearer current-session' })) }));

const skill = {
  score: 72, recordScore: 61, recordWins: 6, recordLosses: 4, scoredMatches: 10,
  eligibleMatches: 10, actualWins: 6, expectedWins: 3.8, winsAboveExpected: 2.2,
  toughMatches: 2, toughWins: 1, provisional: true, modelVersion: 'private-build-id',
};

describe('tracked friend skill view', () => {
  it('uses the private friend endpoint and the player skill layout without exposing a build ID', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({
      friend: { friend_name: 'Alex', friend_player_tag: '#ALEX' },
      skillStatus: 'Recent recorded games',
      stats: { skill, modelVersion: 'private-build-id', windowMatches: 10, scoredMatches: 10,
        firstMatch: '2026-10-01T00:00:00Z', lastMatch: '2026-10-07T00:00:00Z',
        toughWins: [], favorableLosses: [] },
    }) });
    global.fetch = fetchMock;

    render(<PlayerStatsView friendId="friend-1" />);

    expect(await screen.findByRole('heading', { name: "Alex's matchup skill" })).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Best win' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Toughest loss' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Back to friends' })).toHaveAttribute('href', '/dashboard');
    expect(fetchMock).toHaveBeenCalledWith('/api/friend-decks?friendId=friend-1', expect.objectContaining({ headers: { authorization: 'Bearer current-session' } }));
    expect(screen.queryByText(/private-build-id/)).not.toBeInTheDocument();
  });
});
