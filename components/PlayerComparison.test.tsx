import { fireEvent, render, screen } from '@testing-library/react';
import PlayerComparison from './PlayerComparison';
import { requestPublicSnapshot } from '@/lib/public-snapshot-client';

jest.mock('@/lib/public-snapshot-client', () => ({ requestPublicSnapshot: jest.fn() }));
const request = requestPublicSnapshot as jest.Mock;
afterEach(() => { jest.clearAllMocks(); });

it('normalizes distinct tags and compares only after explicit submission', async () => {
  request.mockImplementation(async (_kind, tag) => ({ playerTag: tag, fetchedAt: '2026-10-22T00:00:00Z', score: 60, status: 'ready', comparisonKey: 'same', scoredGames: 20, eligibleGames: 25, availableGames: 25, wins: 12, losses: 13, scoredFirstMatch: '2026-10-20T00:00:00Z', scoredLastMatch: '2026-10-22T00:00:00Z' }));
  render(<PlayerComparison />);
  expect(request).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Your player tag'), { target: { value: 'p0yq' } });
  fireEvent.change(screen.getByLabelText('Friend player tag'), { target: { value: '#p0y2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Compare recent performance' }));
  expect(await screen.findByText('Similar recent snapshots')).toBeInTheDocument();
  expect(request).toHaveBeenCalledWith('player', '#P0YQ', expect.any(AbortSignal));
  expect(request).toHaveBeenCalledWith('player', '#P0Y2', expect.any(AbortSignal));
  fireEvent.change(screen.getByLabelText('Your player tag'), { target: { value: '#P0Y8' } });
  expect(screen.queryByText('Similar recent snapshots')).not.toBeInTheDocument();
});

it('rejects duplicate normalized tags without spending quota', async () => {
  render(<PlayerComparison />);
  fireEvent.change(screen.getByLabelText('Your player tag'), { target: { value: 'p0yq' } });
  fireEvent.change(screen.getByLabelText('Friend player tag'), { target: { value: '#P0YQ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Compare recent performance' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('two different');
  expect(request).not.toHaveBeenCalled();
});
