const { createClient } = require('@supabase/supabase-js');
const { createHash } = require('node:crypto');
const { enumerateSyncUsers, runScheduledSync, loadScheduledSyncContexts } = require('./dist/lib/scheduled-sync.js');

async function main() {
  for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CLASH_ROYALE_API_KEY']) {
    if (!process.env[key]) throw new Error('Missing worker configuration: ' + key);
  }
  const log = (event, details = {}) => process.stdout.write(JSON.stringify({ event, ...details }) + '\n');
  const jobStarted = Date.now();
  const concurrency = Number(process.env.SYNC_CONCURRENCY || 64);
  const launchIntervalMs = Number(process.env.SYNC_LAUNCH_INTERVAL_MS || 0);
  const dbMetrics = { requests: 0, responseMs: 0, maxResponseMs: 0, statuses: {} };
  const baseFetch = globalThis.fetch.bind(globalThis);
  const timedFetch = async (input, init = {}) => {
    const originalSignal = init.signal || (typeof input === 'object' && input?.signal);
    const url = typeof input === 'string' ? input : input.url || String(input);
    const database = url.startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const started = Date.now();
    if (database) dbMetrics.requests++;
    try {
      const response = await baseFetch(input, { ...init, signal: originalSignal ? AbortSignal.any([originalSignal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) });
      if (database) dbMetrics.statuses[response.status] = (dbMetrics.statuses[response.status] || 0) + 1;
      return response;
    } finally {
      if (database) { const ms = Date.now() - started; dbMetrics.responseMs += ms; dbMetrics.maxResponseMs = Math.max(dbMetrics.maxResponseMs, ms); }
    }
  };
  // Also bound the existing battle processor's own Supabase client's requests.
  globalThis.fetch = timedFetch;
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: timedFetch },
  });
  // Railway's native cron skips a new execution while this service is active.
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  let summary = { success: false, mode: process.env.SYNC_JOB_MODE || 'run' };
  try {
    const users = await enumerateSyncUsers((page, perPage) => client.auth.admin.listUsers({ page, perPage }), 1000);
    const authMs = Date.now() - jobStarted;
    const { getPlayerBattleLog, getClashApiMetrics } = require('./dist/lib/clashRoyaleApi.js');
    const candidates = users.filter(user => typeof user.user_metadata?.player_tag === 'string' && user.user_metadata.player_tag.trim()).slice(0, 3);
    let gameApiReady = candidates.length === 0;
    for (const user of candidates) {
      try {
        await getPlayerBattleLog(user.user_metadata.player_tag);
        gameApiReady = true;
        break;
      } catch { /* A deleted/invalid account tag need not invalidate healthy credentials. */ }
    }
    if (!gameApiReady) throw new Error('Game API preflight failed');
    const prefetchStarted = Date.now();
    const { contexts, friendCount, ratingCount } = await loadScheduledSyncContexts(client, users);
    const prefetchMs = Date.now() - prefetchStarted;
    if (process.env.SYNC_JOB_MODE === 'check') {
      summary = { success: true, mode: 'check', totalUsers: users.length, friendCount, ratingCount, authMs, prefetchMs, api: getClashApiMetrics(), database: dbMetrics };
      log('sync_preflight_complete', summary);
      return;
    }
    const { syncBattlesForUser } = require('./dist/utils/battleProcessor.js');
    // Legacy helpers log raw upstream/database errors. Keep scheduled logs aggregate-only.
    console.error = (label, error) => {
      const code = typeof error?.code === 'string' && /^[A-Z0-9]{5,12}$/.test(error.code) ? error.code : undefined;
      const httpStatus = Number(error?.message?.match(/API error: (\d{3})/)?.[1]) || undefined;
      log('sync_dependency_error', { category: String(label).includes('friend history') ? 'friend_history' : 'storage', code, httpStatus });
    };
    log('sync_started', { totalUsers: users.length, concurrency, launchIntervalMs, apiIntervalMs: Number(process.env.CLASH_REQUEST_INTERVAL_MS || 10), friendCount, ratingCount, authMs, prefetchMs });
    summary = await runScheduledSync({
      users, sync: (id, tag) => syncBattlesForUser(id, tag, contexts.get(id)), concurrency, launchIntervalMs, maxAttempts: 2,
      signal: controller.signal, progress: value => log('sync_progress', value),
      onFailure: ({ userId, categories }) => log('sync_account_failed', { accountRef: createHash('sha256').update(userId).digest('hex').slice(0, 12), categories }),
    });
    log('sync_complete', { ...summary, jobMs: Date.now() - jobStarted, authMs, prefetchMs, api: getClashApiMetrics(), database: dbMetrics });
    if (!summary.success) process.exitCode = 1;
  } catch {
    log('sync_failed', { reason: 'job_failed', mode: process.env.SYNC_JOB_MODE || 'run' });
    process.exitCode = 1;
  } finally {
    process.removeListener('SIGTERM', stop);
    process.removeListener('SIGINT', stop);
  }
}

main().catch(() => {
  process.stderr.write('Scheduled sync failed; check service configuration and dependency status.\n');
  process.exitCode = 1;
}).finally(() => {
  // A cron must exit; clients/fetch keep-alive pools must not block the next execution.
  process.stdout.write('', () => process.exit(process.exitCode || 0));
});
