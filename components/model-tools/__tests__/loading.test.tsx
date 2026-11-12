import { act, render, screen, waitFor } from '@testing-library/react';
import ModelWorkbench from '../ModelWorkbench';
import { fetchCatalog, fetchExamples } from '../api';

jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
jest.mock('../api', () => ({ fetchCatalog: jest.fn(), fetchExamples: jest.fn(), predict: jest.fn(), counter: jest.fn(), complete: jest.fn() }));

it('renders the workbench immediately and enables cards without waiting for examples', async () => {
  let resolveExamples!: (value: unknown) => void;
  jest.mocked(fetchExamples).mockReturnValue(new Promise(resolve => { resolveExamples = resolve; }));
  jest.mocked(fetchCatalog).mockResolvedValue({ variants: [{ key: '1:0', name: 'Knight' }], towers: [] });
  render(<ModelWorkbench mode="counter" title="Find a counter deck" description="Choose eight cards." />);
  expect(screen.getByRole('heading', { name: 'Find a counter deck' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Deck card slots' })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Card 1: choose a card' })).toBeEnabled());
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  await act(async () => { resolveExamples({ examples: [] }); });
});

it('keeps the tool usable when optional examples fail', async () => {
  jest.mocked(fetchCatalog).mockResolvedValue({ variants: [{ key: '1:0', name: 'Knight' }], towers: [] });
  jest.mocked(fetchExamples).mockRejectedValue(new Error('Examples offline'));
  render(<ModelWorkbench mode="counter" title="Find a counter deck" description="Choose eight cards." />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Find counters' })).toBeEnabled());
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('shows a recoverable error if the required card library fails', async () => {
  jest.mocked(fetchCatalog).mockRejectedValue(new Error('Card service unavailable'));
  jest.mocked(fetchExamples).mockResolvedValue([]);
  render(<ModelWorkbench mode="counter" title="Find a counter deck" description="Choose eight cards." />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Card service unavailable');
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Find counters' })).toBeDisabled();
});
