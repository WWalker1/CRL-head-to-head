import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PublicPlayerLookup from './PublicPlayerLookup';
import { capturePublicLookup } from '@/lib/public-lookup-analytics';

jest.mock('@/lib/public-lookup-analytics', () => ({ capturePublicLookup: jest.fn() }));

const originalFetch = global.fetch;
const data = {
  playerTag: '#P0YQ', fetchedAt: '2026-10-21T12:00:00.000Z', firstMatch: null, lastMatch: null,
  availableGames: 5, eligibleGames: 4, scoredGames: 4, wins: 3, losses: 1,
  score: 70, expectedWins: 2.2, winsAboveExpected: 0.8, provisional: true, status: 'ready', highlights: [],
};
afterEach(() => { global.fetch = originalFetch; jest.clearAllMocks(); });
function submit() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Player tag' }), { target: { value: '#P0YQ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Check recent performance' }));
}

it('performs a user-triggered public request without account credentials and displays sample context', async () => {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => data });
  global.fetch = fetchMock as typeof fetch;
  render(<PublicPlayerLookup />);
  expect(fetchMock).not.toHaveBeenCalled();
  submit();
  expect(await screen.findByText('70/100')).toBeInTheDocument();
  expect(screen.getByText(/4 model-supported games.*provisional/)).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/public-player', expect.objectContaining({ credentials: 'omit', body: JSON.stringify({ playerTag: '#P0YQ' }) }));
  expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'content-type': 'application/json' });
  expect(capturePublicLookup).toHaveBeenNthCalledWith(1, { name: 'public_lookup_started' });
  expect(capturePublicLookup).toHaveBeenNthCalledWith(2, { name: 'public_lookup_completed', eligibleGames: 4, scoredGames: 4, status: 'ready' });
  expect(JSON.stringify((capturePublicLookup as jest.Mock).mock.calls)).not.toContain('#P0YQ');
});

it('explains a model outage without rendering the recent win rate as a skill score', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ...data, score: null, scoredGames: 0, status: 'model_unavailable' }) }) as typeof fetch;
  render(<PublicPlayerLookup />);
  submit();
  expect(await screen.findByText('Unavailable')).toBeInTheDocument();
  expect(screen.getByText(/have not substituted a win percentage/)).toBeInTheDocument();
});

it('makes rate limiting actionable and prevents repeat submissions while pending', async () => {
  let finish!: (response: unknown) => void;
  global.fetch = jest.fn(() => new Promise<unknown>(resolve => { finish = resolve; })) as typeof fetch;
  render(<PublicPlayerLookup />);
  submit();
  expect(screen.getByRole('button', { name: 'Checking recent games…' })).toBeDisabled();
  finish({ ok: false, status: 429, json: async () => ({ error: 'limited' }) });
  expect(await screen.findByRole('alert')).toHaveTextContent('shared networks can share a limit');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Check recent performance' })).toBeEnabled());
});

it('ends a stalled lookup and restores the submit button after its deadline', async () => {
  jest.useFakeTimers();
  try {
    global.fetch = jest.fn((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })) as typeof fetch;
    render(<PublicPlayerLookup />);
    submit();
    await act(async () => { jest.advanceTimersByTime(25000); });
    expect(screen.getByRole('alert')).toHaveTextContent('took too long');
    expect(screen.getByRole('button', { name: 'Check recent performance' })).toBeEnabled();
  } finally { jest.useRealTimers(); }
});
