/** @jest-environment node */
import { normalizePlayerTag, publicSnapshotRows, readPublicPlayerSnapshot, readPublicOpponentSnapshot } from '../public-player';
import { getPlayerBattleLogSnapshot } from '../clashRoyaleApi';

jest.mock('../clashRoyaleApi', () => ({ getPlayerBattleLogSnapshot: jest.fn() }));
const log = getPlayerBattleLogSnapshot as jest.Mock;
const cutoff = '2026-09-01T00:00:00.000Z';
const metadata = { model_version: 'test-v1', training_cutoff: cutoff };
const originalEnv = { ...process.env };
const originalFetch = global.fetch;

function battle(tag: string, time = '20261020T120000.000Z', win = true, extras: Record<string, unknown> = {}) {
  const side = (playerTag: string, crowns: number) => ({
    tag: playerTag, crowns,
    cards: Array.from({ length: 8 }, (_, i) => ({ id: 26000000 + i, name: `Card ${i}`, rarity: 'common', level: 14 })),
    supportCards: [{ id: 159000000, rarity: 'common', level: 14 }],
  });
  return { type: 'PvP', battleTime: time, gameMode: { id: 72000006 }, deckSelection: 'collection', team: [side(tag, win ? 3 : 0)], opponent: [side('#2PP', win ? 0 : 3)], ...extras };
}
const response = (value: unknown, ok = true) => ({ ok, json: async () => value });

beforeEach(() => {
  jest.clearAllMocks();
  process.env.MODEL_TOOLS_ENABLED = '1';
  process.env.MODEL_SERVICE_URL = 'https://model.test';
  process.env.MODEL_SERVICE_TOKEN = 'test-only';
});
afterEach(() => { process.env = { ...originalEnv }; global.fetch = originalFetch; });

it('normalizes tag case/spacing and rejects URLs, path injection and non-string input', () => {
  expect(normalizePlayerTag('  #p0yq  ')).toBe('#P0YQ');
  expect(normalizePlayerTag('p0yq')).toBe('#P0YQ');
  for (const invalid of [null, {}, 123, 'https://test', '#ABC', '#P0YQ/battlelog', '#P0', '#'.repeat(10)]) expect(normalizePlayerTag(invalid)).toBeNull();
});

it('deduplicates physical games, excludes draft/draw/2v2, and bounds the most recent window', () => {
  const valid = Array.from({ length: 30 }, (_, i) => battle('#P0YQ', `20261020T12${String(i).padStart(2, '0')}00.000Z`));
  const draw = battle('#P0YQ'); draw.team[0].crowns = 0;
  const rows = publicSnapshotRows([valid[0], ...valid, draw, battle('#P0YQ', undefined, true, { deckSelection: 'draft' }), battle('#P0YQ', undefined, true, { team: [] })], '#P0YQ');
  expect(rows).toHaveLength(25);
  expect(rows[0].battle_time).toBe('2026-10-20T12:29:00.000Z');
  expect(new Set(rows.map(row => row.physical_match_id)).size).toBe(25);
});

it('scores in one bounded batch with deck-only inputs and exposes no opponents, identity or model version', async () => {
  const tag = '#P0Y2';
  const input = battle(tag);
  log.mockResolvedValue([input]);
  const [row] = publicSnapshotRows([input], tag);
  const fetchMock = jest.fn().mockResolvedValueOnce(response(metadata)).mockResolvedValueOnce(response({ ...metadata, scores: [{ id: row.physical_match_id, probability: 0.7 }] }));
  global.fetch = fetchMock as typeof fetch;
  const snapshot = await readPublicPlayerSnapshot(tag);
  expect(snapshot).toMatchObject({ playerTag: tag, score: 80, wins: 1, losses: 0, scoredGames: 1, status: 'ready', provisional: true });
  const body = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(Object.keys(body.matches[0]).sort()).toEqual(['decks', 'id']);
  expect(JSON.stringify(body)).not.toMatch(/friend_result|opponent_tag|player_tag|P0Y2/);
  expect(JSON.stringify(snapshot)).not.toMatch(/test-v1|opponent_tag|physical_match_id|test-only/);
});

it('returns record only on model failure instead of manufacturing a skill score', async () => {
  log.mockResolvedValue([battle('#P0Y8')]);
  global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as typeof fetch;
  expect(await readPublicPlayerSnapshot('#P0Y8')).toMatchObject({ score: null, wins: 1, scoredGames: 0, status: 'model_unavailable' });
});

it('does not submit pre-cutoff games and draws for scoring', async () => {
  const tag = '#P0Y9';
  const draw = battle(tag); draw.team[0].crowns = 0;
  log.mockResolvedValue([battle(tag, '20260820T120000.000Z'), draw]);
  const fetchMock = jest.fn().mockResolvedValue(response(metadata));
  global.fetch = fetchMock as typeof fetch;
  expect(await readPublicPlayerSnapshot(tag)).toMatchObject({ score: null, eligibleGames: 1, status: 'no_supported_games' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('rejects model-version drift and probabilities for unrequested matches', async () => {
  const tag = '#P0YP';
  log.mockResolvedValue([battle(tag)]);
  const fetchMock = jest.fn().mockResolvedValueOnce(response(metadata)).mockResolvedValueOnce(response({ ...metadata, model_version: 'other', scores: [{ id: 'invented', probability: 0.2 }] }));
  global.fetch = fetchMock as typeof fetch;
  expect(await readPublicPlayerSnapshot(tag)).toMatchObject({ score: null, status: 'model_unavailable', scoredGames: 0 });
});

it('coalesces concurrent requests and reuses a successful snapshot within five minutes', async () => {
  log.mockResolvedValue([]);
  const [first, second] = await Promise.all([readPublicPlayerSnapshot('#P0YL'), readPublicPlayerSnapshot('#P0YL')]);
  expect(second).toBe(first);
  expect(await readPublicPlayerSnapshot('#P0YL')).toBe(first);
  expect(log).toHaveBeenCalledTimes(1);
});

it('does not cache failed game requests', async () => {
  log.mockRejectedValueOnce(new Error('upstream offline')).mockResolvedValueOnce([]);
  await expect(readPublicPlayerSnapshot('#P0YQ')).rejects.toThrow('upstream offline');
  expect(await readPublicPlayerSnapshot('#P0YQ')).toMatchObject({ score: null, eligibleGames: 0 });
  expect(log).toHaveBeenCalledTimes(2);
});

it('imports complete opponent forms, levels and tower without inference or opponent identity', async () => {
  const input = battle('#P0JG');
  Object.assign(input.opponent[0].cards[0], { evolutionLevel: 1 });
  log.mockResolvedValue([input]);
  global.fetch = jest.fn() as typeof fetch;
  const result = await readPublicOpponentSnapshot('#P0JG');
  expect(result.decks).toHaveLength(1);
  expect(result.decks[0].deck.cards[0]).toMatchObject({ key: '26000000:1', level: 14 });
  expect(result.decks[0].deck).toMatchObject({ tower_id: 159000000, tower_level: 14 });
  expect(JSON.stringify(result)).not.toMatch(/opponent_tag|physical_match_id|#2PP/);
  expect(global.fetch).not.toHaveBeenCalled();
});

it('shares one public game fetch between opponent import and performance lookup', async () => {
  log.mockResolvedValue([]);
  await Promise.all([readPublicOpponentSnapshot('#P0JC'), readPublicPlayerSnapshot('#P0JC')]);
  expect(log).toHaveBeenCalledTimes(1);
});

it('does not guess an absent tower for opponent import', async () => {
  const input = battle('#P0JV');
  input.opponent[0].supportCards = [];
  log.mockResolvedValue([input]);
  expect((await readPublicOpponentSnapshot('#P0JV')).decks).toHaveLength(0);
});

it('does not let an expired failing request evict its successful replacement', async () => {
  const now = jest.spyOn(Date, 'now');
  const start = Date.now();
  let rejectOld!: (reason: Error) => void;
  log.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject; })).mockResolvedValue([]);
  try {
    now.mockReturnValue(start);
    const old = readPublicPlayerSnapshot('#P0YU');
    const failed = expect(old).rejects.toThrow('old request failed');
    now.mockReturnValue(start + 300001);
    const replacement = await readPublicPlayerSnapshot('#P0YU');
    rejectOld(new Error('old request failed'));
    await failed;
    expect(await readPublicPlayerSnapshot('#P0YU')).toBe(replacement);
    expect(log).toHaveBeenCalledTimes(2);
  } finally { now.mockRestore(); }
});
