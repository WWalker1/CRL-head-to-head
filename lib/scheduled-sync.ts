type User = { id: string; user_metadata?: { player_tag?: unknown } };
type SyncResult = { battlesProcessed: number; recordsUpdated: number; newBattles: number; errors: string[] };

/** Bulk-load account-scoped inputs once instead of two reads for every account. */
export async function loadScheduledSyncContexts(client: any, users: User[], includeDigests = false) {
  const contexts = new Map<string, { userId: string; friends: Array<{ id: string; friend_player_tag: string }>; rating?: any; cleanupOnlyIfNewBattles: boolean; historySnapshot?: { digests: Record<string, string>; onSkip?: () => void; onWrite?: (rows: number) => void } }>();
  for (const user of users) contexts.set(user.id, { userId: user.id, friends: [], cleanupOnlyIfNewBattles: true, ...(includeDigests ? { historySnapshot: { digests: {} } } : {}) });
  let friendCount = 0;
  let ratingCount = 0;
  let nextOffset = 0;
  const loadBatches = async () => {
    while (nextOffset < users.length) {
      const offset = nextOffset;
      nextOffset += 200;
      const ids = users.slice(offset, offset + 200).map(user => user.id);
      const ratings = await client.from('user_ratings').select('user_id,player_tag,elo_rating,num_ranked_games,updated_at').in('user_id', ids);
      if (ratings.error || !Array.isArray(ratings.data)) throw new Error('Rating prefetch failed');
      for (const row of ratings.data) {
        const context = contexts.get(row.user_id);
        if (!context || !ids.includes(row.user_id)) throw new Error('Rating prefetch scope mismatch');
        context.rating = row; ratingCount++;
      }
      let position = 0;
      while (true) {
        const friends = await client.from('tracked_friends').select('id,user_id,friend_player_tag', { count: 'exact' }).in('user_id', ids).order('id').range(position, position + 999);
        if (friends.error || !Array.isArray(friends.data) || typeof friends.count !== 'number') throw new Error('Friend prefetch failed');
        for (const row of friends.data) {
          const context = contexts.get(row.user_id);
          if (!context || !ids.includes(row.user_id)) throw new Error('Friend prefetch scope mismatch');
          context.friends.push({ id: row.id, friend_player_tag: row.friend_player_tag }); friendCount++;
        }
        position += friends.data.length;
        if (position >= friends.count) break;
        if (!friends.data.length) throw new Error('Friend prefetch pagination stalled');
      }
      if (includeDigests) {
        let position = 0;
        while (true) {
          const states = await client.from('history_subject_totals').select('user_id,subject_type,subject_id,last_log_digest', { count: 'exact' }).in('user_id', ids).order('user_id').order('subject_type').order('subject_id').range(position, position + 999);
          if (states.error || !Array.isArray(states.data) || typeof states.count !== 'number') throw new Error('History snapshot prefetch failed');
          for (const row of states.data) {
            const context = contexts.get(row.user_id);
            if (!context || !ids.includes(row.user_id)) throw new Error('History snapshot scope mismatch');
            if (typeof row.last_log_digest === 'string') context.historySnapshot!.digests[`${row.subject_type}:${row.subject_id}`] = row.last_log_digest;
          }
          position += states.data.length;
          if (position >= states.count) break;
          if (!states.data.length) throw new Error('History snapshot pagination stalled');
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, Math.ceil(users.length / 200)) }, loadBatches));
  return { contexts, friendCount, ratingCount };
}
export type SyncSummary = {
  success: boolean; totalUsers: number; eligibleUsers: number; processed: number;
  succeeded: number; failed: number; deferred: number; newBattles: number; durationMs: number;
  failureCategories: Record<string, number>;
};

function failureCategory(reason: string) {
  if (/API error: 404/.test(reason)) return 'player_unavailable';
  if (/API error: 403|credentials/i.test(reason)) return 'upstream_authorization';
  if (/429|rate.limit/i.test(reason)) return 'upstream_rate_limit';
  if (/history unavailable for tracked friend/i.test(reason)) return 'friend_history';
  if (/history|migration 009/i.test(reason)) return 'history_storage';
  if (/rating/i.test(reason)) return 'rating_storage';
  if (/fetch|offline|timeout|timed.out|network|API error: 5\d\d/i.test(reason)) return 'dependency_unavailable';
  return 'sync_error';
}

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
    for (const user of rows) users.set(user.id, { id: user.id, user_metadata: { player_tag: user.user_metadata?.player_tag } });
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
  maxAttempts?: number;
  onFailure?: (failure: { userId: string; categories: string[] }) => void;
  sleep?: (ms: number) => Promise<void>; now?: () => number;
  progress?: (summary: Omit<SyncSummary, 'success' | 'deferred' | 'durationMs' | 'failureCategories'>) => void;
}): Promise<SyncSummary> {
  const concurrency = options.concurrency ?? 4;
  const interval = options.launchIntervalMs ?? 500;
  const attempts = options.maxAttempts ?? 1;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 128 || interval < 0 || !Number.isFinite(interval) || !Number.isInteger(attempts) || attempts < 1 || attempts > 3) throw new Error('Invalid worker limits');
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const start = now();
  const users = options.users.filter(user => typeof user.user_metadata?.player_tag === 'string' && user.user_metadata.player_tag.trim());
  const summary = { totalUsers: options.users.length, eligibleUsers: users.length, processed: 0, succeeded: 0, failed: 0, newBattles: 0 };
  const failureCategories: Record<string, number> = {};
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
      let reasons: string[] = [];
      for (let attempt = 0; attempt < attempts; attempt++) {
        try {
          result = await options.sync(user.id, user.user_metadata!.player_tag as string);
          reasons = Array.isArray(result?.errors) ? result.errors : ['Invalid sync result'];
          summary.newBattles += Number.isFinite(result?.newBattles) ? result!.newBattles : 0;
        } catch (error) {
          result = undefined;
          reasons = [error instanceof Error ? error.message : 'Unknown sync error'];
        }
        const permanent = reasons.some(reason => /API error: (403|404)/.test(reason));
        if (!reasons.length || permanent || attempt + 1 >= attempts || options.signal?.aborted) break;
        await sleep(2000);
        if (options.signal?.aborted) break;
      }
      summary.processed++;
      if (result && Array.isArray(result.errors) && result.errors.length === 0) {
        summary.succeeded++;
      } else {
        summary.failed++;
        const categories = [...new Set(reasons.map(failureCategory))];
        for (const category of categories) failureCategories[category] = (failureCategories[category] || 0) + 1;
        options.onFailure?.({ userId: user.id, categories });
      }
      if (summary.processed % 25 === 0) options.progress?.({ ...summary });
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, users.length) }, worker));
  const deferred = users.length - summary.processed;
  return { ...summary, success: summary.failed === 0 && deferred === 0 && !options.signal?.aborted, deferred, durationMs: now() - start, failureCategories };
}
