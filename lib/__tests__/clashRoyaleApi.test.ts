import { getPlayerBattleLog } from '../clashRoyaleApi';

describe('Clash Royale API rate limits', () => {
  const originalKey = process.env.CLASH_ROYALE_API_KEY;

  beforeEach(() => {
    jest.useFakeTimers();
    process.env.CLASH_ROYALE_API_KEY = 'test-key';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalKey === undefined) delete process.env.CLASH_ROYALE_API_KEY;
    else process.env.CLASH_ROYALE_API_KEY = originalKey;
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
});
