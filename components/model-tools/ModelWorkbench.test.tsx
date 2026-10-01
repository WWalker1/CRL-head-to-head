import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ModelWorkbench, { normalizeExamples } from './ModelWorkbench';

jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

const cards = Array.from({ length: 9 }, (_, index) => ({ key: `2600000${index + 1}:0`, card_id: 26000001 + index, form: 0, name: `Card ${index + 1}`, min_level: 1 }));
const deck = { cards: cards.slice(0, 8).map((card) => ({ key: card.key, level: 14 })), tower_id: 159000000, tower_level: 14 };
const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

async function chooseCard(slot: number, name: string) {
  fireEvent.click(screen.getByRole('button', { name: `Card ${slot}: choose a card` }));
  fireEvent.click(await screen.findByRole('button', { name: `Select ${name}` }));
}

describe('ModelWorkbench', () => {
  beforeEach(() => { jest.restoreAllMocks(); });

  it('accepts the catalog examples shape and preserves card levels', () => {
    const parsed = normalizeExamples([{ name: 'Fixture', decks: [deck, deck] }]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].decks?.[0].cards[0]).toEqual({ key: '26000001:0', level: 14 });
  });

  it('does not render a stale prediction after an input changes', async () => {
    let resolvePrediction!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => { resolvePrediction = resolve; });
    global.fetch = jest.fn((input, init) => {
      const url = String(input);
      if (url.endsWith('/catalog')) return Promise.resolve(response({ variants: cards, towers: [{ id: 159000000, name: 'Tower Princess' }] }));
      if (url.endsWith('/examples')) return Promise.resolve(response([{ name: 'Fixture', decks: [deck, deck] }]));
      if (init?.method === 'POST') return pending;
      return Promise.resolve(response({}, 404));
    });
    render(<ModelWorkbench mode="matchup" title="Test" description="Test" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Fixture' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Score matchup' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Card 1: Card 1' })[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Select Card 9' }));
    await act(async () => resolvePrediction(response({ probability_a: 0.9, model_version: 'test' })));
    expect(screen.queryByText('Matchup estimate')).toBeNull();
  });

  it.each([false, true])('preserves mandatory cards and rejects invalid completion (invalid=%s)', async (invalid) => {
    let resolveCompletion!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => { resolveCompletion = resolve; });
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/catalog')) return Promise.resolve(response({ variants: cards, towers: [{ id: 159000000, name: 'Tower Princess' }] }));
      if (url.endsWith('/examples')) return Promise.resolve(response([]));
      if (init?.method === 'POST') return pending;
      return Promise.resolve(response({}, 404));
    });
    global.fetch = fetchMock;
    render(<ModelWorkbench mode="builder" title="Test" description="Test" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Complete my deck' })).toBeTruthy());
    for (let index = 0; index < 4; index += 1) await chooseCard(index + 1, `Card ${index + 1}`);
    fireEvent.click(screen.getByRole('button', { name: 'Complete my deck' }));
    await waitFor(() => expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/complete'))).toBe(true));
    const request = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/complete'))!;
    expect(JSON.parse(request[1]!.body as string).locked).toEqual(cards.slice(0, 4).map((card) => card.key));
    expect(screen.queryByRole('button', { name: /Lock/ })).toBeNull();
    await act(async () => resolveCompletion(response({ candidates: [{ deck: { ...deck, cards: (invalid ? cards.slice(4) : cards).map((card) => ({ key: card.key, level: 16 })) }, probability: 0.6 }] })));
    if (invalid) {
      expect(screen.getByRole('alert').textContent).toContain('dropped one of your selected cards');
      expect(screen.queryByText('Completion candidates')).toBeNull();
    } else expect(screen.getByText('Completion candidates')).toBeTruthy();
  });
});
