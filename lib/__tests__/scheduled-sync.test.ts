import { enumerateSyncUsers, runScheduledSync, loadScheduledSyncContexts } from '../scheduled-sync';

const users = (count: number) => Array.from({ length: count }, (_, i) => ({ id: String(i), user_metadata: { player_tag: '#TAG' + i } }));
const result = { battlesProcessed: 1, recordsUpdated: 1, newBattles: 1, errors: [] };

describe('Railway scheduled sync', () => {
  it('enumerates an exact multiple of full pages through the terminating empty page', async () => {
    const all = users(4);
    const list = jest.fn(async (page: number, size: number) => ({ data: { users: all.slice((page - 1) * size, page * size) }, error: null }));
    expect(await enumerateSyncUsers(list, 2)).toHaveLength(4);
    expect(list).toHaveBeenCalledTimes(3);
  });
  it('fails on an Auth error or malformed later page instead of syncing a partial population', async () => {
    const list = jest.fn().mockResolvedValueOnce({ data: { users: users(2) }, error: null }).mockResolvedValueOnce({ data: null, error: new Error('offline') });
    await expect(enumerateSyncUsers(list, 2)).rejects.toThrow('Auth enumeration failed');
    await expect(enumerateSyncUsers(async () => ({ data: { users: null } as any, error: null }))).rejects.toThrow('Auth enumeration failed');
  });
  it('detects a repeated full page rather than looping forever', async () => {
    await expect(enumerateSyncUsers(async () => ({ data: { users: users(2) }, error: null }), 2)).rejects.toThrow('no progress');
  });
  it('retains only required account metadata during enumeration', async () => {
    const data = [{ id: 'account', email: 'synthetic@example.com', user_metadata: { player_tag: '#P0YQ', unrelated: 'discard' } }];
    expect(await enumerateSyncUsers(async () => ({ data: { users: data }, error: null }))).toEqual([{ id: 'account', user_metadata: { player_tag: '#P0YQ' } }]);
  });
  it('bulk-loads isolated account contexts and follows truncated friend pages using their total count', async () => {
    const friends = [{ id: 'a', user_id: '0', friend_player_tag: '#A' }, { id: 'b', user_id: '0', friend_player_tag: '#B' }, { id: 'c', user_id: '1', friend_player_tag: '#C' }];
    const range = jest.fn((offset: number) => Promise.resolve({ data: friends.slice(offset, offset + 1), count: 3, error: null }));
    const chain: any = { select: () => chain, in: () => chain, order: () => chain, range, then: (resolve: any) => Promise.resolve({ data: [{ user_id: '0', player_tag: '#TAG0' }], error: null }).then(resolve) };
    const result = await loadScheduledSyncContexts({ from: () => chain }, users(2));
    expect(result.friendCount).toBe(3);
    expect(range).toHaveBeenCalledTimes(3);
    expect(result.contexts.get('0')?.friends.map(row => row.id)).toEqual(['a', 'b']);
    expect(result.contexts.get('1')?.friends.map(row => row.id)).toEqual(['c']);
  });
  it('rejects out-of-scope prefetch data before any syncing', async () => {
    const chain: any = { select: () => chain, in: () => chain, then: (resolve: any) => Promise.resolve({ data: [{ user_id: 'another-owner' }], error: null }).then(resolve) };
    await expect(loadScheduledSyncContexts({ from: () => chain }, users(1))).rejects.toThrow('scope mismatch');
  });
  it('processes every eligible user with at most four active jobs', async () => {
    let active = 0;
    let maximum = 0;
    const sync = jest.fn(async () => {
      active++; maximum = Math.max(maximum, active);
      await new Promise(resolve => setTimeout(resolve, 1));
      active--; return result;
    });
    const summary = await runScheduledSync({ users: [...users(41), { id: 'none' }], sync, launchIntervalMs: 0 });
    expect(maximum).toBe(4);
    expect(sync).toHaveBeenCalledTimes(41);
    expect(summary).toMatchObject({ success: true, totalUsers: 42, eligibleUsers: 41, processed: 41, succeeded: 41, failed: 0, deferred: 0, newBattles: 41 });
  });
  it('paces starts across the whole worker pool', async () => {
    let clock = 0;
    const starts: number[] = [];
    await runScheduledSync({ users: users(5), now: () => clock, sleep: async ms => { clock += ms; }, sync: async () => { starts.push(clock); return result; }, launchIntervalMs: 500, concurrency: 1 });
    expect(starts).toEqual([0, 500, 1000, 1500, 2000]);
  });
  it('reports returned errors and exceptions and still finishes later users', async () => {
    const sync = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ...result, errors: ['save failed'] }).mockResolvedValue(result);
    const summary = await runScheduledSync({ users: users(5), sync, launchIntervalMs: 0 });
    expect(summary).toMatchObject({ success: false, processed: 5, failed: 2, succeeded: 3, deferred: 0 });
  });
  it('drains active work and reports deferred users after a lost lease or shutdown', async () => {
    const controller = new AbortController();
    const sync = jest.fn(async () => { controller.abort(); return result; });
    const summary = await runScheduledSync({ users: users(5), sync, signal: controller.signal, concurrency: 1, launchIntervalMs: 0 });
    expect(summary).toMatchObject({ success: false, processed: 1, deferred: 4 });
  });
  it('does not report an already-aborted empty run as successful', async () => {
    await expect(runScheduledSync({ users: [], sync: jest.fn(), signal: AbortSignal.abort() })).resolves.toMatchObject({ success: false });
  });
  it('retries a transient partial failure once and counts only newly inserted battles', async () => {
    const sync = jest.fn().mockResolvedValueOnce({ ...result, newBattles: 2, errors: ['History unavailable for tracked friend example'] }).mockResolvedValueOnce({ ...result, newBattles: 0 });
    const summary = await runScheduledSync({ users: users(1), sync, maxAttempts: 2, launchIntervalMs: 0, sleep: async () => {} });
    expect(sync).toHaveBeenCalledTimes(2);
    expect(summary).toMatchObject({ success: true, failed: 0, newBattles: 2 });
  });
  it.each([[404, 'player_unavailable'], [403, 'upstream_authorization']])('does not retry permanent HTTP %s failures and categorizes them', async (status, category) => {
    const onFailure = jest.fn();
    const sync = jest.fn().mockResolvedValue({ ...result, errors: [`Failed to sync battles: Clash Royale API error: ${status}`] });
    const summary = await runScheduledSync({ users: users(1), sync, maxAttempts: 2, launchIntervalMs: 0, onFailure });
    expect(sync).toHaveBeenCalledTimes(1);
    expect(summary).toMatchObject({ success: false, failureCategories: { [category]: 1 } });
    expect(onFailure).toHaveBeenCalledWith({ userId: '0', categories: [category] });
  });
});
