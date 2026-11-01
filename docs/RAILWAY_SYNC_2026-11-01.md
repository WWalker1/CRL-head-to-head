# Production scheduled sync on Railway

## Owner direction

Move daily collection execution and scheduling to Railway. Keep the existing production game's visual feel; the redesigned dev UI is not approved for production. Retain fifty full games per tracked subject and preserve lifetime totals. Earlier handoffs requiring the Vercel schedule are superseded by this migration.

## Deployment target

- GitHub: WWalker1/CRL-head-to-head; infrastructure branch `codex/railway-nightly-sync`, based on production main, not the redesigned dev source.
- Railway project: protective-optimism (`2bf3af82-e5f7-4266-8606-5cc411ae6d54`), production environment `30987d1c-2d64-4a27-a32a-a5db0c4b1a4b`.
- New service: nightly-battle-sync (`8f305b20-25cd-4787-8881-b46d63950b39`). The existing model service is unchanged.
- Dockerfile: `workers/nightly-sync/Dockerfile`; start: `node workers/nightly-sync/run.cjs`; native cron `0 2 * * *` (02:00 UTC daily); restart policy NEVER; 0.5 GB memory and 0.5 vCPU limits. No public domain, HTTP handler or persistent volume.
- Service settings are configured directly through Railway. A railway.json attempt was rejected as deprecated; no deprecated Config-as-Code file is included.

## Runtime behavior

- A small standalone image compiles the same existing battle processor/history code, with only seventeen pinned dependency packages from the existing lockfile. It does not build or launch Next.js and does not ship player archives or model weights.
- Enumerates Auth in 200-user pages before starting writes. Errors/malformed/repeated pages fail explicitly. An exact full page requires the following terminating page, avoiding the old pagination gap.
- Four user syncs maximum, at least 500ms between user starts, and 200ms between all upstream game API attempts across the pool. Existing HTTP 429 retries and request timeouts remain enabled.
- Processes the complete eligible population without the old Vercel 4.5-minute admission deadline. Failed users are counted while later users still run. Incomplete/failed jobs exit nonzero; successful jobs exit zero. Signals stop new admissions and drain active work.
- Railway's native cron skips a scheduled start while the preceding execution is active. Do not create a second collector service or manually start a second collector while this one is running.
- Structured Railway logs contain aggregate progress every 25 users and a final completion summary. The worker does not store per-run/per-user database logs. No new coordination table or schema migration is required.
- `SYNC_JOB_MODE=check` validates complete Auth enumeration and game API access without running the battle processor. Set `SYNC_JOB_MODE=run` for collection. `MATCH_HISTORY_ENABLED=1`, `CLASH_REQUEST_INTERVAL_MS=200` and the existing Supabase/game API credentials are configured on this service; secret values stay outside Git.

## Storage longevity

The already-applied fifty-game database trigger remains authoritative for both owner/friend history. Lifetime friend wins/losses, subject counts and compact deck totals remain separate. The worker uses the same capture/upsert paths and does not add another archive, database, Redis service or volume. The prior cleanup reduced measured database size from 444 MB to 279 MB; that is a point-in-time value, not a permanent size guarantee as accounts grow.

## Cutover sequence and rollback

1. Deploy in check mode and verify successful exit/log summary.
2. Switch to run mode and observe one complete production sync in Railway. The Vercel schedule remains enabled until this succeeds; do not manually invoke Vercel collection.
3. Remove the scheduled cron from production `vercel.json` and deploy the infrastructure-only main commit. Preserve the old UI. Verify main SHA and public site health.
4. Read back Railway's cron, restart policy, source and variables; verify no duplicate Vercel schedule remains in deployed source.

On a future Railway failure, inspect aggregate logs and repair/re-run the single Railway service. For a scheduler rollback, first stop/disable the Railway cron, then restore Vercel scheduling, ensuring only one scheduler owns collection. Do not restore Vercel while a Railway run is active.

## Verification

Worker compilation, TypeScript and lint passed locally. Focused scheduler/battle/history/API tests cover complete pagination, malformed/failed pages, duplicate-page protection, four-worker concurrency, launch pacing, returned/thrown failures, shutdown/deferred reporting and upstream pacing. No production success is claimed until Railway reports a completed full run.
