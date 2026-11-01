type User = { id: string; user_metadata?: { player_tag?: unknown } };
type SyncResult = { battlesProcessed: number; recordsUpdated: number; newBattles: number; errors: string[] };
export type SyncSummary = {
  success: boolean; totalUsers: number; eligibleUsers: number; processed: number;
  succeeded: number; failed: number; deferred: number; newBattles: number; durationMs: number;
};

/** Enumerate completely before writing; a failed Auth page cannot silently omit accounts. */
export async function enumerateSyncUsers(
  listUsers: (page: number, perPage: number) => Promise<{ data: { users: User[] } | null; error: unknown }>,
  perPage = 200,
) {
  const users = new Map<string, User>();
  for (let page = 1; page <= 10000; page++) {
    const result = await listUsers(page, perPage);
    if (result.error || !Array.isArray(result.data?.users)) throw new Error('Auth enumeration failed');
    const rows = result.data.users;
    if (rows.some(user => !user || typeof user.id !== 'string' || !user.id)) throw new Error('Invalid Auth page');
    const prior = users.size;
    for (const user of rows) users.set(user.id, user);
    if (rows.length < perPage) return [...users.values()];
    if (users.size === prior) throw new Error('Auth pagination made no progress');
  }
  throw new Error('Auth pagination limit exceeded');
}

/** A long-running job, not an HTTP handler. No admission deadline drops later accounts. */
export async function runScheduledSync(options: {
  users: User[];
  sync: (id: string, tag: string) => Promise<SyncResult>;
  concurrency?: number; launchIntervalMs?: number; signal?: AbortSignal;
  sleep?: (ms: number) => Promise<void>; now?: () => number;
  progress?: (summary: Omit<SyncSummary, 'success' | 'deferred' | 'durationMs'>) => void;
}): Promise<SyncSummary> {
  const concurrency = options.concurrency ?? 4;
  const interval = options.launchIntervalMs ?? 500;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 15 || interval < 0 || !Number.isFinite(interval)) throw new Error('Invalid worker limits');
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const start = now();
  const users = options.users.filter(user => typeof user.user_metadata?.player_tag === 'string' && user.user_metadata.player_tag.trim());
  const summary = { totalUsers: options.users.length, eligibleUsers: users.length, processed: 0, succeeded: 0, failed: 0, newBattles: 0 };
  let next = 0;
  let nextLaunch = start;
  let launchQueue = Promise.resolve();
  const slot = () => {
    const ready = launchQueue.then(async () => {
      const delay = nextLaunch - now();
      if (delay > 0) await sleep(delay);
      nextLaunch = now() + interval;
    });
    launchQueue = ready;
    return ready;
  };
  const worker = async () => {
    while (!options.signal?.aborted) {
      const index = next++;
      if (index >= users.length) return;
      await slot();
      if (options.signal?.aborted) return;
      const user = users[index];
      let result: SyncResult | undefined;
      try {
        result = await options.sync(user.id, user.user_metadata!.player_tag as string);
      } catch { /* One failed account must not stop the remaining accounts. */ }
      summary.processed++;
      if (result && Array.isArray(result.errors) && result.errors.length === 0) {
        summary.succeeded++;
      } else {
        summary.failed++;
      }
      summary.newBattles += Number.isFinite(result?.newBattles) ? result!.newBattles : 0;
      if (summary.processed % 25 === 0) options.progress?.({ ...summary });
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, users.length) }, worker));
  const deferred = users.length - summary.processed;
  return { ...summary, success: summary.failed === 0 && deferred === 0 && !options.signal?.aborted, deferred, durationMs: now() - start };
}
