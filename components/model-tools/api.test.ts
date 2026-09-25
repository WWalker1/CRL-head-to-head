import { complete, counter } from './api';

const response = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

describe('model request contracts', () => {
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
});
