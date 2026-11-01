import { getPlayerBattleLog, getPlayerBattleLogSnapshot, getClashApiMetrics } from '../clashRoyaleApi';

describe('Clash Royale API rate limits', () => {
  const originalKey = process.env.CLASH_ROYALE_API_KEY;
  const originalInterval = process.env.CLASH_REQUEST_INTERVAL_MS;
  const originalMode = process.env.SYNC_JOB_MODE;

  beforeEach(() => {
    jest.useFakeTimers();
    process.env.CLASH_ROYALE_API_KEY = 'test-key';
    global.fetch = jest.fn();
    delete process.env.SYNC_JOB_MODE;
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalKey === undefined) delete process.env.CLASH_ROYALE_API_KEY;
    else process.env.CLASH_ROYALE_API_KEY = originalKey;
    if (originalInterval === undefined) delete process.env.CLASH_REQUEST_INTERVAL_MS;
    else process.env.CLASH_REQUEST_INTERVAL_MS = originalInterval;
    if (originalMode === undefined) delete process.env.SYNC_JOB_MODE;
    else process.env.SYNC_JOB_MODE = originalMode;
  });

  it('retries a transient 429 and returns the battle log', async () => {
    jest.mocked(fetch)
      .mockResolvedValueOnce({ ok: false, status: 429, headers: new Headers(), text: async () => 'limited' } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ battleTime: 'recent' }] } as Response);
    const pending = getPlayerBattleLog('#PLAYER');
    await jest.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toEqual([{ battleTime: 'recent' }]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry invalid credentials', async () => {
    jest.mocked(fetch).mockResolvedValue({ ok: false, status: 403, text: async () => 'denied' } as Response);
    await expect(getPlayerBattleLog('#PLAYER')).rejects.toThrow('Clash Royale API error: 403');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not retry public snapshots on 429, preserving their one-call budget', async () => {
    jest.mocked(fetch).mockResolvedValue({ ok: false, status: 429, headers: new Headers(), text: async () => 'limited' } as Response);
    await expect(getPlayerBattleLogSnapshot('#P0YQ')).rejects.toThrow('Clash Royale API error: 429');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('bounds public log input and disables HTTP caching', async () => {
    jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => Array.from({ length: 60 }, (_, i) => ({ index: i })) } as Response);
    await expect(getPlayerBattleLogSnapshot('#P0YQ')).resolves.toHaveLength(50);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('%23P0YQ/battlelog'), expect.objectContaining({ cache: 'no-store' }));
  });

  it('paces simultaneous worker requests across the shared API queue', async () => {
    process.env.CLASH_REQUEST_INTERVAL_MS = '200';
    jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as unknown as Response);
    const pending = Promise.all([getPlayerBattleLog('#ONE'), getPlayerBattleLog('#TWO'), getPlayerBattleLog('#THREE')]);
    await jest.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(199);
    expect(fetch).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(200);
    await pending;
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('shares one worker request for normalized owner/friend tags and drops unused image URLs', async () => {
    process.env.SYNC_JOB_MODE = 'run';
    process.env.CLASH_REQUEST_INTERVAL_MS = '0';
    const card = { id: 1, level: 15, evolutionLevel: 1, iconUrls: { medium: 'https://example.com/card.png' } };
    jest.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => [{ team: [{ cards: [card] }], opponent: [] }] } as unknown as Response);
    const [first, second] = await Promise.all([getPlayerBattleLog('#P0YQ'), getPlayerBattleLog('p0yq')]);
    await getPlayerBattleLog('#P0YQ');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(first).toMatchObject([{ team: [{ cards: [{ id: 1, level: 15, evolutionLevel: 1 }] }] }]);
    expect(first).not.toHaveProperty('0.team.0.cards.0.iconUrls');
    expect(getClashApiMetrics().cachedPlayers).toBeGreaterThanOrEqual(1);
  });
  it('negative-caches missing worker players without retrying their public log', async () => {
    process.env.SYNC_JOB_MODE = 'run';
    process.env.CLASH_REQUEST_INTERVAL_MS = '0';
    jest.mocked(fetch).mockResolvedValue({ ok: false, status: 404, text: async () => 'not found' } as Response);
    await expect(getPlayerBattleLog('#P2YQ')).rejects.toThrow('404');
    await expect(getPlayerBattleLog('#P2YQ')).rejects.toThrow('404');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
