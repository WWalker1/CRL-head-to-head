import { enumerateSyncUsers, runScheduledSync } from '../scheduled-sync';

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
});
