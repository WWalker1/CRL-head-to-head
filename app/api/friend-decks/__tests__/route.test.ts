/** @jest-environment node */
import { NextRequest } from 'next/server';

const mock = {
  auth: { getUser: jest.fn() },
  from: jest.fn(),
  rpc: jest.fn(),
};
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => mock) }));
jest.mock('@/lib/clashRoyaleApi', () => ({ getPlayerBattleLog: jest.fn() }));

import { getPlayerBattleLog } from '@/lib/clashRoyaleApi';
import { POST } from '../route';

const friend = { id: 'friend-1', friend_name: 'Rival', friend_player_tag: '#RIVAL', total_wins: 7, total_losses: 3 };
const cards = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Card ${i + 1}`, rarity: 'common', level: 16, evolutionLevel: i === 0 ? 2 : 0 }));
function battle(type: string, modeId: number) {
  return { type, battleTime: '20260921T000000.000Z', gameMode: { id: modeId }, deckSelection: 'collection', team: [{ tag: '#RIVAL', crowns: 2, cards, supportCards: [{ id: 159000001, name: 'Tower', rarity: 'common', level: 16 }] }], opponent: [{ tag: '#OTHER', crowns: 0, cards, supportCards: [{ id: 159000002, name: 'Tower 2', rarity: 'common', level: 15 }] }] };
}
function request(body: unknown, authorization = 'Bearer token') { return new NextRequest('http://localhost/api/friend-decks', { method: 'POST', headers: { authorization, 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
function setupDb(friendRow: any = friend) {
  mock.auth.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  mock.rpc.mockResolvedValue({ data: 0, error: null });
  mock.from.mockImplementation((table: string) => {
    const chain: any = { select: jest.fn(() => chain), eq: jest.fn(() => chain), order: jest.fn(() => chain), limit: jest.fn(() => Promise.resolve({ data: [], error: null })), maybeSingle: jest.fn(() => Promise.resolve({ data: table === 'tracked_friends' ? friendRow : null, error: null })), upsert: jest.fn(() => Promise.resolve({ error: null })) };
    return chain;
  });
}

describe('friend-decks refresh route', () => {
  beforeEach(() => { jest.clearAllMocks(); process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'; });

  it('rejects unauthenticated refreshes before touching the database', async () => {
    const response = await POST(request({ friendId: 'friend-1' }, ''));
    expect(response.status).toBe(401);
    expect(mock.from).not.toHaveBeenCalled();
    expect(getPlayerBattleLog).not.toHaveBeenCalled();
  });

  it('rejects a friend belonging to another user and never fetches that tag', async () => {
    setupDb(null);
    const response = await POST(request({ friendId: 'other-friend' }));
    expect(response.status).toBe(404);
    expect(getPlayerBattleLog).not.toHaveBeenCalled();
  });

  it('ignores fabricated body.logs and persists only normalized authoritative battles', async () => {
    setupDb(); (getPlayerBattleLog as jest.Mock).mockResolvedValue([battle('PvP', 72000006)]);
    const response = await POST(request({ friendId: 'friend-1', logs: [{ physical_match_id: 'forged', mode: 'ladder', friend_result: 'win', friend_deck: { cards: [] } }] }));
    expect(response.status).toBe(200);
    expect(getPlayerBattleLog).toHaveBeenCalledWith('#RIVAL');
    const history = (mock.from.mock.results.find(result => result.value?.upsert?.mock.calls.length)?.value);
    expect(history).toBeDefined();
    expect(history.upsert).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ physical_match_id: expect.not.stringMatching('forged') })]), expect.anything());
  });

  it('normalizes supported PvP and ranked source records with hero forms and tower levels', async () => {
    setupDb(); (getPlayerBattleLog as jest.Mock).mockResolvedValue([battle('PvP', 72000006), battle('pathOfLegend', 72000464)]);
    const response = await POST(request({ friendId: 'friend-1' }));
    expect(response.status).toBe(200);
    const history = mock.from.mock.results.find(result => result.value?.upsert?.mock.calls.length)?.value;
    const inserted = history.upsert.mock.calls[0][0];
    expect(inserted).toHaveLength(2);
    expect(inserted[0].friend_deck.cards.find((card: any) => card.id === '1')).toEqual(expect.objectContaining({ form: '2', level: 16 }));
    expect(inserted[0].friend_deck.tower).toBe('159000001');
    expect(inserted[0].friend_deck.towerLevel).toBe(16);
  });
});
