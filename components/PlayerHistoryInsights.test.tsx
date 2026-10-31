import { act, render, screen } from '@testing-library/react';
import PlayerHistoryInsights from './PlayerHistoryInsights';

jest.mock('./MatchupSkill', () => ({ __esModule: true, default: ({ status }: { status: string }) => <p>{status}</p> }));
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

it('clears the previous result on refresh and ignores late results from the old request', async () => {
  let finishOld!: (response: unknown) => void;
  const fetchMock = jest.fn()
    .mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
    .mockResolvedValueOnce({ ok: true, json: async () => ({ skill: {}, skillStatus: 'new snapshot' }) });
  global.fetch = fetchMock as typeof fetch;
  const { rerender } = render(<PlayerHistoryInsights revision={0} />);
  const oldSignal = fetchMock.mock.calls[0][1].signal as AbortSignal;
  rerender(<PlayerHistoryInsights revision={1} />);
  expect(oldSignal.aborted).toBe(true);
  expect(await screen.findByText('new snapshot')).toBeInTheDocument();
  await act(async () => { finishOld({ ok: true, json: async () => ({ skill: {}, skillStatus: 'old snapshot' }) }); });
  expect(screen.queryByText('old snapshot')).not.toBeInTheDocument();
  expect(screen.getByText('new snapshot')).toBeInTheDocument();
});
