import { getPlayerBattleLog } from '../clashRoyaleApi';
import { captureUserHistory, persistHistory } from '../history-storage';

jest.mock('../clashRoyaleApi', () => ({ getPlayerBattleLog: jest.fn() }));

const mockedGetPlayerBattleLog = jest.mocked(getPlayerBattleLog);
const apiCards = Array.from({ length: 8 }, (_, index) => ({
  id: String(index + 1),
  rarity: 'common',
  level: 16,
}));

function battle(friendTag: string, opponentTag = '#OPPONENT') {
  return {
    type: 'pathOfLegend',
    battleTime: '20260921T000000.000Z',
    gameMode: { id: 72000464, name: 'Path of Legend' },
    deckSelection: 'collection',
    isLadderTournament: false,
    isHostedMatch: false,
    team: [{
      tag: friendTag,
      name: friendTag,
      crowns: 1,
      cards: apiCards,
      supportCards: [{ id: 159000000, rarity: 'common', level: 16 }],
    }],
    opponent: [{
      tag: opponentTag,
      name: opponentTag,
      crowns: 0,
      cards: apiCards,
      supportCards: [{ id: 159000000, rarity: 'common', level: 16 }],
    }],
  };
}

function makeClient(error: unknown = null) {
  const upsert = jest.fn().mockResolvedValue({ error });
  const from = jest.fn((_table: string) => ({ upsert }));
  return { client: { from }, from, upsert };
}

describe('history storage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stores player history under user and player ownership keys', async () => {
    const { client, from, upsert } = makeClient();
    expect(await persistHistory(client, { userId: 'user-1', playerTag: '#PLAYER' }, [battle('#PLAYER')])).toBe(1);
    expect(from).toHaveBeenCalledWith('player_match_history');
    const [rows, options] = upsert.mock.calls[0];
    expect(rows[0]).toMatchObject({ user_id: 'user-1', player_tag: '#PLAYER', result: 'win', player_deck: { cards: expect.any(Array) } });
    expect(rows[0]).not.toHaveProperty('friend_result');
    expect(options).toEqual({ onConflict: 'user_id,player_tag,physical_match_id', ignoreDuplicates: true });
  });

  it('stores tracked friend history under the user and tracked friend keys', async () => {
    const { client, from, upsert } = makeClient();
    await persistHistory(client, { userId: 'user-1', playerTag: '#FRIEND', friendId: 'friend-7' }, [battle('#FRIEND')]);
    expect(from).toHaveBeenCalledWith('friend_match_history');
    const [rows, options] = upsert.mock.calls[0];
    expect(rows[0]).toMatchObject({ user_id: 'user-1', tracked_friend_id: 'friend-7', friend_result: 'win', friend_deck: { cards: expect.any(Array) } });
    expect(options).toEqual({ onConflict: 'tracked_friend_id,physical_match_id', ignoreDuplicates: true });
  });

  it('uses duplicate-safe upsert so repeated physical matches are harmless', async () => {
    const { client, upsert } = makeClient();
    const repeated = battle('#PLAYER');
    await persistHistory(client, { userId: 'user-1', playerTag: '#PLAYER' }, [repeated, repeated]);
    expect(upsert.mock.calls[0][0]).toHaveLength(2);
    expect(upsert.mock.calls[0][1]).toMatchObject({ onConflict: 'user_id,player_tag,physical_match_id', ignoreDuplicates: true });
  });

  it('raises when the database upsert fails', async () => {
    const { client } = makeClient(new Error('database unavailable'));
    await expect(persistHistory(client, { userId: 'user-1', playerTag: '#PLAYER' }, [battle('#PLAYER')]))
      .rejects.toThrow('Could not store match history. Check migration 009.');
  });

  it('persists the player record when there are no tracked friends', async () => {
    const { client, from } = makeClient();
    const errors = await captureUserHistory(client, 'user-1', '#PLAYER', [battle('#PLAYER')], []);
    expect(errors).toEqual([]);
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('player_match_history');
  });

  it('keeps successful history writes and reports individual friend fetch failures', async () => {
    const { client, from, upsert } = makeClient();
    mockedGetPlayerBattleLog.mockImplementation(async (tag: string) => {
      if (tag === '#BROKEN') throw new Error('API unavailable');
      return [battle(tag)];
    });
    const errors = await captureUserHistory(client, 'user-1', '#PLAYER', [battle('#PLAYER')], [
      { id: 'friend-ok', friend_player_tag: '#OK' },
      { id: 'friend-broken', friend_player_tag: '#BROKEN' },
    ]);
    expect(errors).toEqual(['History unavailable for tracked friend friend-broken.']);
    expect(from.mock.calls.map(call => call[0])).toEqual(['player_match_history', 'friend_match_history']);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[1][0][0]).toMatchObject({ user_id: 'user-1', tracked_friend_id: 'friend-ok' });
  });
});
