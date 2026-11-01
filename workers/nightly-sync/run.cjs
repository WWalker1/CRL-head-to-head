const { createClient } = require('@supabase/supabase-js');
const { createHash } = require('node:crypto');
const { enumerateSyncUsers, runScheduledSync } = require('./dist/lib/scheduled-sync.js');

async function main() {
  for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CLASH_ROYALE_API_KEY']) {
    if (!process.env[key]) throw new Error('Missing worker configuration: ' + key);
  }
  const log = (event, details = {}) => process.stdout.write(JSON.stringify({ event, ...details }) + '\n');
  const baseFetch = globalThis.fetch.bind(globalThis);
  const timedFetch = (input, init = {}) => {
    const originalSignal = init.signal || (typeof input === 'object' && input?.signal);
    return baseFetch(input, { ...init, signal: originalSignal ? AbortSignal.any([originalSignal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) });
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
    const users = await enumerateSyncUsers((page, perPage) => client.auth.admin.listUsers({ page, perPage }));
    const { getPlayerBattleLog } = require('./dist/lib/clashRoyaleApi.js');
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
    if (process.env.SYNC_JOB_MODE === 'check') {
      summary = { success: true, mode: 'check', totalUsers: users.length };
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
    log('sync_started', { totalUsers: users.length, concurrency: 4, apiIntervalMs: Number(process.env.CLASH_REQUEST_INTERVAL_MS || 200) });
    summary = await runScheduledSync({
      users, sync: syncBattlesForUser, concurrency: 4, launchIntervalMs: 500, maxAttempts: 2,
      signal: controller.signal, progress: value => log('sync_progress', value),
      onFailure: ({ userId, categories }) => log('sync_account_failed', { accountRef: createHash('sha256').update(userId).digest('hex').slice(0, 12), categories }),
    });
    log('sync_complete', summary);
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
