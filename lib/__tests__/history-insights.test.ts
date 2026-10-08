import { readHistoryInsights } from '../history-insights';

const serviceUrl = 'http://model.test';
const token = 'test-token';
const cutoff = '2026-09-01T00:00:00.000Z';
const metadata = { model_version: 'model-v2', training_cutoff: cutoff };

function deck() {
  return {
    cards: Array.from({ length: 8 }, (_, index) => ({ id: String(index + 1), form: '0', level: 16 })),
    tower: '159000000',
    towerLevel: 16,
  };
}

function historyRow(id: string, battleTime: string, result: 'win' | 'loss' | 'draw' = 'win', extras: Record<string, unknown> = {}) {
  return {
    physical_match_id: id,
    battle_time: battleTime,
    mode: 'ranked',
    friend_result: result,
    friend_deck: deck(),
    opponent_deck: deck(),
    ...extras,
  };
}

function database(rows: any[], totals = rows.length ? [{ deck_key: 'recent-deck', deck: deck(), match_count: rows.length }] : [], totalCount = rows.length) {
  const makeQuery = (data: any[]) => {
    const query: any = {
      select: jest.fn(() => query),
      eq: jest.fn(() => query),
      order: jest.fn(() => query),
      limit: jest.fn((limit: number) => Promise.resolve({ data: data.slice(0, limit), error: null })),
      then: (resolve: (value: { data: any[]; error: null }) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve, reject),
    };
    return query;
  };
  const upsert = jest.fn().mockResolvedValue({ error: null });
  const client = {
    from: jest.fn((table: string) => ({ ...makeQuery(table === 'history_deck_totals' ? totals : rows), upsert })),
    rpc: jest.fn().mockResolvedValue({ data: totalCount, error: null }),
  };
  return { client, upsert };
}

function response(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

describe('readHistoryInsights', () => {
  const originalFetch = global.fetch;
  const originalTimeout = AbortSignal.timeout;
  const originalEnabled = process.env.MODEL_TOOLS_ENABLED;
  const originalUrl = process.env.MODEL_SERVICE_URL;
  const originalToken = process.env.MODEL_SERVICE_TOKEN;

  beforeEach(() => {
    process.env.MODEL_TOOLS_ENABLED = '1';
    process.env.MODEL_SERVICE_URL = serviceUrl;
    process.env.MODEL_SERVICE_TOKEN = token;
    Object.defineProperty(AbortSignal, 'timeout', { configurable: true, value: jest.fn(() => ({})) });
  });
  afterEach(() => {
    global.fetch = originalFetch;
    Object.defineProperty(AbortSignal, 'timeout', { configurable: true, value: originalTimeout });
    if (originalEnabled === undefined) delete process.env.MODEL_TOOLS_ENABLED;
    else process.env.MODEL_TOOLS_ENABLED = originalEnabled;
    if (originalUrl === undefined) delete process.env.MODEL_SERVICE_URL;
    else process.env.MODEL_SERVICE_URL = originalUrl;
    if (originalToken === undefined) delete process.env.MODEL_SERVICE_TOKEN;
    else process.env.MODEL_SERVICE_TOKEN = originalToken;
  });

  it('never sends pre-training-cutoff matches or draws for inference', async () => {
    const rows = [
      historyRow('before', '2026-08-31T23:59:59.000Z'),
      historyRow('draw-after', '2026-09-02T00:00:00.000Z', 'draw'),
    ];
    const { client, upsert } = database(rows);
    const fetchMock = jest.fn().mockResolvedValue(response(metadata));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await readHistoryInsights(client, { userId: 'user-1', playerTag: '#PLAYER' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${serviceUrl}/ready`, expect.any(Object));
    expect(upsert).not.toHaveBeenCalled();
    expect(result.skill.score).toBeNull();
  });

  it('sends no match outcome, stores supported post-cutoff estimates, and summarizes skill', async () => {
    const rows = [historyRow('new-match', '2026-09-02T00:00:00.000Z', 'win')];
    const { client, upsert } = database(rows);
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(response(metadata))
      .mockResolvedValueOnce(response({ model_version: metadata.model_version, training_cutoff: cutoff, scores: [{ id: 'new-match', probability: 0.7 }] }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await readHistoryInsights(client, { userId: 'user-1', playerTag: '#PLAYER' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const inferenceCall = fetchMock.mock.calls[1];
    expect(inferenceCall[0]).toBe(`${serviceUrl}/score-history`);
    const request = JSON.parse(inferenceCall[1].body as string);
    expect(request.matches).toHaveLength(1);
    expect(request.matches[0]).toMatchObject({ id: 'new-match', decks: [expect.any(Object), expect.any(Object)] });
    expect(JSON.stringify(request)).not.toMatch(/friend_result|result|outcome|win/i);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0][0]).toMatchObject({
      physical_match_id: 'new-match',
      expected_win_probability: 0.7,
      prediction_model_version: 'model-v2',
      prediction_eligible: true,
    });
    expect(result.skill).toMatchObject({ modelVersion: 'model-v2', scoredMatches: 1, actualWins: 1, expectedWins: 0.7 });
    expect(result.skill.score).toBe(50.7);
  });

  it('preserves stored history and returns no invented score when the model is unavailable', async () => {
    const rows = [historyRow('saved', '2026-09-02T00:00:00.000Z', 'win', {
      expected_win_probability: 0.1,
      prediction_model_version: 'old-model',
      prediction_eligible: true,
    })];
    const { client, upsert } = database(rows);
    const fetchMock = jest.fn().mockRejectedValue(new Error('service unavailable'));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await readHistoryInsights(client, { userId: 'user-1', playerTag: '#PLAYER' });

    expect(result.summary.eligibleMatches).toBe(1);
    expect(result.summary.topDecks).toHaveLength(1);
    expect(result.skill.modelVersion).toBeNull();
    expect(result.skill.score).toBeNull();
    expect(result.skill.scoredMatches).toBe(0);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('uses compact all-time counters for its top five decks and total record count', async () => {
    const rows = [historyRow('recent', '2026-09-02T00:00:00.000Z')];
    const totals = Array.from({ length: 6 }, (_, index) => ({
      deck_key: `deck-${index + 1}`,
      deck: { ...deck(), tower: `tower-${index + 1}` },
      match_count: [90, 50, 25, 15, 10, 5][index],
    }));
    const { client } = database(rows, totals, 200);
    global.fetch = jest.fn().mockRejectedValue(new Error('service unavailable')) as unknown as typeof fetch;

    const result = await readHistoryInsights(client, { userId: 'user-1', playerTag: '#PLAYER' });

    expect(client.from).toHaveBeenCalledWith('history_deck_totals');
    expect(client.rpc).toHaveBeenCalledWith('history_match_count', {
      p_user_id: 'user-1', p_subject_type: 'player', p_subject_id: '#PLAYER',
    });
    expect(result.summary.allTimeMatches).toBe(200);
    expect(result.summary.topDecks.map(deck => deck.count)).toEqual([90, 50, 25, 15, 10]);
    expect(result.summary.topDecks).toHaveLength(5);
    expect(result.summary.coverage).toBe(190 / 200);
  });

  it('scores only the latest 100 friend games against any opponent within the owner scope', async () => {
    const rows = Array.from({ length: 101 }, (_, index) => historyRow(`match-${index}`, new Date(Date.UTC(2026, 9, 6) - index * 60000).toISOString(), 'win', {
      mode: 'other', opponent_tag: `#OTHER${index}`, expected_win_probability: 0.2,
      prediction_model_version: 'model-v2', prediction_eligible: true,
    }));
    const { client } = database(rows);
    global.fetch = jest.fn().mockResolvedValue(response(metadata)) as unknown as typeof fetch;

    const result = await readHistoryInsights(client, { userId: 'owner', playerTag: '#FRIEND', friendId: 'friend-1' });
    const historyQuery = client.from.mock.results[0].value;
    expect(client.from).toHaveBeenCalledWith('friend_match_history');
    expect(historyQuery.eq).toHaveBeenCalledWith('user_id', 'owner');
    expect(historyQuery.eq).toHaveBeenCalledWith('tracked_friend_id', 'friend-1');
    expect(historyQuery.limit).toHaveBeenCalledWith(100);
    expect(result.skill.scoredMatches).toBe(100);
    expect(result.stats.toughWins).toHaveLength(5);
    expect(result.stats.windowMatches).toBe(100);
  });
});
