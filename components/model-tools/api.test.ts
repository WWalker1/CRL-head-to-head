import { complete, counter } from './api';
import { createClient } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({ createClient: jest.fn() }));

const response = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

describe('model request contracts', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
  });
  it('sends completion locks without a target deck', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response({ candidates: [] }));
    global.fetch = fetchMock;
    await complete(['26000001:0', '26000002:1'], 14, 159000000, 14);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({ locked: ['26000001:0', '26000002:1'], excluded: [], level: 14, tower_id: 159000000, tower_level: 14 });
    expect(body.target).toBeUndefined();
  });

  it('sends locked canonical keys for counter search', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response({ candidates: [] }));
    global.fetch = fetchMock;
    const target = { cards: [{ key: '26000001:0', level: 14 }], tower_id: 159000000, tower_level: 14 };
    await counter(target, ['26000001:0'], 14, 159000000, 14);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.locked).toEqual(['26000001:0']);
    expect(body.target).toEqual(target);
  });

  it('forwards the browser session token and shows the server error instead of a false sign-in prompt', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://db.example';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test';
    (createClient as jest.Mock).mockReturnValue({ auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'fresh-token' } } }) } });
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'Model service authorization failed.' }) });
    global.fetch = fetchMock;
    await expect(counter({ cards: [], tower_id: 159000000, tower_level: 16 }, [], 16, 159000000, 16)).rejects.toThrow('Model service authorization failed.');
    expect(fetchMock.mock.calls[0][1].headers).toEqual(expect.objectContaining({ authorization: 'Bearer fresh-token' }));
  });
});
