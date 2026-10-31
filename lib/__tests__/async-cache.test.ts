import { createAsyncCache } from '../async-cache';

afterEach(() => jest.restoreAllMocks());

it('expires derived values with their source rather than extending freshness', async () => {
  const clock = jest.spyOn(Date, 'now').mockReturnValue(100);
  const cache = createAsyncCache<{ expires: number }>(300, 2, () => true, value => value.expires);
  const load = jest.fn().mockResolvedValue({ expires: 150 });
  await cache('a', load);
  clock.mockReturnValue(149);
  await cache('a', load);
  expect(load).toHaveBeenCalledTimes(1);
  clock.mockReturnValue(150);
  await cache('a', load);
  expect(load).toHaveBeenCalledTimes(2);
});

it('coalesces pending work and evicts oldest entries at capacity', async () => {
  const cache = createAsyncCache<number>(300, 2);
  const load = jest.fn().mockResolvedValue(1);
  await Promise.all([cache('a', load), cache('a', load)]);
  expect(load).toHaveBeenCalledTimes(1);
  await cache('b', load);
  await cache('c', load);
  await cache('a', load);
  expect(load).toHaveBeenCalledTimes(4);
});
