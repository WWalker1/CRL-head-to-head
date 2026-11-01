# Production scheduled sync on Railway

## Owner direction

Move daily collection execution and scheduling to Railway. Keep the existing production game's visual feel; the redesigned dev UI is not approved for production. Retain fifty full games per tracked subject and preserve lifetime totals. Earlier handoffs requiring the Vercel schedule are superseded by this migration.

## Deployment target

- GitHub: WWalker1/CRL-head-to-head; infrastructure branch `codex/railway-nightly-sync`, based on production main, not the redesigned dev source.
- Railway project: protective-optimism (`2bf3af82-e5f7-4266-8606-5cc411ae6d54`), production environment `30987d1c-2d64-4a27-a32a-a5db0c4b1a4b`.
- New service: nightly-battle-sync (`8f305b20-25cd-4787-8881-b46d63950b39`). The existing model service is unchanged.
- Dockerfile: `workers/nightly-sync/Dockerfile`; start: `node workers/nightly-sync/run.cjs`; verified native cron `0 2 * * *` (02:00 UTC daily); restart policy NEVER; 1 GB memory and 1 vCPU limits. No public domain, HTTP handler or persistent volume.
- Service settings are configured directly through Railway. A railway.json attempt was rejected as deprecated; no deprecated Config-as-Code file is included.

## Runtime behavior

- A small standalone image compiles the same existing battle processor/history code, with only seventeen pinned dependency packages from the existing lockfile. It does not build or launch Next.js and does not ship player archives or model weights.
- Enumerates Auth in 1,000-user pages before starting writes. Errors/malformed/repeated pages fail explicitly. An exact full page requires the following terminating page, avoiding the old pagination gap.
- After owner feedback about the initial conservative limits, the benchmark configuration is 64 concurrent account tasks, zero account-start delay and a 10ms shared game API interval (at most 100 requests/second). Existing HTTP 429 retries and request timeouts remain enabled. This is an upstream request budget, not a claim of 100 fully persisted accounts/second or a guaranteed thirty-second job.
- Owner and friend logs share one worker-only in-flight/result cache. Tags are normalized; HTTP 404 results are negative-cached. Serialized-buffer cache capacity is bounded to 256 MB / 5,000 subjects. Unused card image URLs are removed from cached logs; all normalization/Elo fields are preserved. The older second raw-response cache is bypassed in workers. Web requests keep their previous transport behavior.
- Friend lists, ratings and history digests are read in account-scoped batches of 200 accounts, with at most four batches concurrently and count-aware pagination. Direct friend-game rating writes still load the current Elo; quiet accounts use the prefetched rating. Cleanup reads are skipped when the worker inserted no new tracked battle. The ordinary web/manual sync path remains unchanged.
- Completion metrics report game API attempts, retries, status counts, cache hits/misses/evictions, distinct tags, database requests/statuses/latencies and whole-job/phase durations.
- Migration `20261031214607_history_snapshot_fingerprints` adds one nullable SHA-256 digest to each existing history-subject counter row. Fingerprints are bulk-read with the worker context and published only after a successful complete history upsert. Identical normalized game-ID sets skip repeat database writes. No match rows, lifetime counts or deck totals are deleted by this optimization. The first fingerprint-filling pass costs additional writes; steady-state measurements must be labeled separately. Enable with `SYNC_SNAPSHOT_DEDUP_ENABLED=1`.
- Worker request-level retries cover transient 5xx responses, including proxy 520/525. Error bodies are drained for connection reuse. An actual HTTP 429 pauses the shared request queue using Retry-After/backoff; the configured 100-rps ceiling does not override an upstream throttle.
- Processes the complete eligible population without the old Vercel 4.5-minute admission deadline. Failed users are counted while later users still run. Incomplete/failed jobs exit nonzero; successful jobs exit zero. Signals stop new admissions and drain active work.
- Future scheduled runs retry a failed account once (except permanent HTTP 403/404). Final summaries group failures by category; private Railway logs contain a short hashed account reference, never a tag or raw upstream error. All worker HTTP/database requests have an outer 30-second timeout; the existing game API's shorter per-attempt timeout is preserved. Completion logging is flushed before process exit.
- Railway's native cron skips a scheduled start while the preceding execution is active. Do not create a second collector service or manually start a second collector while this one is running.
- Structured Railway logs contain aggregate progress every 25 users and a final completion summary. The worker does not store per-run/per-user database logs. No new coordination table or schema migration is required.
- `SYNC_JOB_MODE=check` validates complete Auth enumeration, game API access and bulk database reads without running the battle processor. Set `SYNC_JOB_MODE=run` for collection. Performance variables: `MATCH_HISTORY_ENABLED=1`, `CLASH_REQUEST_INTERVAL_MS=10`, `SYNC_CONCURRENCY=64`, `SYNC_LAUNCH_INTERVAL_MS=0`; existing Supabase/game API credentials stay outside Git.

## Storage longevity

The already-applied fifty-game database trigger remains authoritative for both owner/friend history. Lifetime friend wins/losses, subject counts and compact deck totals remain separate. The worker uses the same capture/upsert paths and does not add another archive, database, Redis service or volume. The prior cleanup reduced measured database size from 444 MB to 279 MB; that is a point-in-time value, not a permanent size guarantee as accounts grow.

## Cutover sequence and rollback

1. Deploy in check mode and verify successful exit/log summary.
2. Switch to run mode and observe one complete production sync in Railway. The Vercel schedule remains enabled until this succeeds; do not manually invoke Vercel collection.
3. Remove the scheduled cron from production `vercel.json` and deploy the infrastructure-only main commit. Preserve the old UI. Verify main SHA and public site health.
4. Read back Railway's cron, restart policy, source and variables; verify no duplicate Vercel schedule remains in deployed source.

On a future Railway failure, inspect aggregate logs and repair/re-run the single Railway service. For a scheduler rollback, first stop/disable the Railway cron, then restore Vercel scheduling, ensuring only one scheduler owns collection. Do not restore Vercel while a Railway run is active.

## Verification

Worker compilation, TypeScript and lint passed locally. The isolated production source passed all 33 suites / 192 tests; its Vercel preview and production builds are READY. Focused scheduler/battle/history/API tests cover complete pagination, malformed/failed pages, duplicate-page protection, bounded prefetch and account concurrency, launch pacing, returned/thrown failures, shutdown/deferred reporting, upstream pacing, shared-cache deduplication and safe history fingerprints.

Initial conservative production pass (worker commit `6aa1849`, Railway deployment `848276cb-ff11-4945-927e-cd9fdece65e0`): all 1,667 accounts attempted, 1,654 succeeded, 13 failed, 2,233 new battles, zero deferred, 1,015,240ms collection duration. This initial image suppressed raw failure details, so those thirteen causes are not inferred. The faster image adds failure categories, safe diagnostic codes and hashed account references. At that measurement the worker used roughly 63 MB memory. The first pass completed before starting any subsequent benchmark; no two collectors were launched together.

First 64-task test retained parsed logs and exhausted V8's approximately 512 MB heap after 825 processed accounts; it was not promoted. Serialized-buffer follow-up (`88ea201`, deployment `71f49498-bb5b-4c2e-badb-8d775fec19a2`) completed all 1,667 accounts in 82,367ms whole-job / 74,878ms collection, with 1,666 successes, one failure and four newly tracked battles. It made 2,934 game API attempts for 2,811 distinct tags, with 52 HTTP 429s, 15 HTTP 500s, 29 HTTP 520s and 27 HTTP 525s; 52 request retries. It also made 6,572 Supabase/Auth requests, exposing unchanged-history upserts as the next optimization. Final RSS was approximately 389 MB with only 26 MB live JS heap; no memory crash. Native region read-back confirmed exactly one replica in `us-east4-eqdc4a`, near Supabase's US East region.

Fingerprint bootstrap (`fa16781`, deployment `4dcdba63-73b9-479d-b7ca-954b6c0640b3`) then completed all 1,667 accounts with zero failures in 64,524ms whole-job / 58,772ms collection. It filled 2,497 subject fingerprints, submitted 47,653 history rows and made 8,919 database/Auth requests. All 25 HTTP 429 responses recovered. This one-time fill is not the steady-state benchmark.

Steady-state follow-up (`e342095bd207c82c53ea8a1975d5af2076dbc6b0`, deployment `545b5c55-58d2-47f9-82e5-f01bead11b6e`) completed all 1,667 accounts with zero failures, zero deferred and one new tracked battle in **51,635ms whole-job / 46,884ms collection**. Auth took 970ms and prefetch 3,364ms. It fetched 2,811 distinct player/friend tags; the shared cache avoided 328 repeat requests. There were 2,827 upstream attempts, including 16 recovered HTTP 429s. It skipped 2,466 unchanged histories and submitted only 834 rows for 31 changed subjects. Database/Auth requests fell to 3,983. Final RSS was 443 MB and live JS heap 38 MB; no cache evictions or memory crash.

This repeat run is approximately twenty times faster than the first conservative run, but it does **not** meet a thirty-second whole-job target. At the configured 100-request/second ceiling, 2,811 distinct tags alone require approximately 28 seconds, before preflight, database work, upstream latency and rate-limit pauses. A later daily run may encounter more changed histories; 51.6 seconds is a measured repeat run, not a runtime guarantee. Earlier failures included real proxy 500/520/525 responses and rate limits; the earliest thirteen failures were not diagnosed, and their causes are not inferred. Request/account retries recovered all errors in the last two full runs.

Production `main` was advanced to `e342095bd207c82c53ea8a1975d5af2076dbc6b0`; Vercel deployment `dpl_63rRqGApx3SSdSLbyuTXXS6M462C` is READY on rival-royale.com. The source comparison contains no stylesheet, home page, layout or navigation redesign. Railway follows `main` pinned to this tested code commit; a subsequent push alone does not change its image. Deployment `4ba5e2ac-a1f2-4296-844c-62f2ebc09a64` built successfully with the daily schedule restored. There is exactly one Virginia replica and no second collector.

The deployed `vercel.json` has an empty cron list. The old Vercel cron endpoint is retired with an authenticated HTTP 410 response (regression-tested) and cannot start collection even with the former valid cron credential. Manual account/friend refresh endpoints are unchanged. The production home page and model catalog returned HTTP 200 after cutover. The existing Railway model service was not changed.

After benchmarking, a live database read confirmed maximum player/friend history counts of fifty and 2,497 fingerprinted subjects. Allocated database size was 330 MB at this later measurement (versus 444 MB before the earlier pruning/reclaim, and 279 MB immediately after it). Repeated benchmark writes and normal new activity change allocated size; the fifty-row cap is verified, and historical size measurements are not presented as current values.
