# Security review — October 8, 2026

## Remediation follow-up

All four findings below have source fixes in the security release. Migration 017 was applied to the existing production database after rollback-only regression checks. Live catalog verification now denies anonymous/authenticated counter RPC execution and authenticated authoritative score writes, while preserving service-role access and authenticated dashboard reads.

User-triggered sync and friend refresh now share a durable per-account 60-second cooldown and a five-minute expiring lease. Budgets reserve 16 logical upstream calls per full sync and one per friend refresh, friend addition, or player validation: 320 per account/day, 640 per address/day, and 10,000 shared/day; address/shared minute caps are 60/120. A game API call retains its existing maximum three attempts on HTTP 429, so these logical-call caps bound attempts to at most three times those totals. Raw addresses are not stored. Failed reservations stop upstream work, and leases release on success/failure or expire after interrupted requests. The nightly cron remains unchanged and uses its trusted path independently of manual refresh budgets.

Ratings are now initialized and updated per account, without copying another account's rating, tag-wide writes, or opponent-account updates. Adding friends preserves existing ratings. A selected public game tag remains unverified; it grants no authority to write another account.

Verification: 163 JavaScript tests across 29 suites, TypeScript checking, a production build, 12 Python service tests, and SQL permission/quota regression checks passed. The Python tests use a local ignored copy of the committed release bundle. GitHub was fetched before implementation continued and again before branch creation; online main matched the reviewed starting commit. Release deployment checks are recorded in the completion message.

The original findings below describe the pre-fix state.

Production commit `0bc7dce` was confirmed Ready at `rival-royale.com`. A disposable signed-in account with an exhausted budget received HTTP 429 from sync, friend refresh, and friend addition before upstream game API work. Anonymous counter RPCs returned 401; direct score updates returned 403; authenticated owner reads returned 200. Public landing pages and the model catalog returned 200, and an unauthenticated cron request returned 401. The test account and its records were removed. Beta is being updated from `codex/security-beta` (`d221f92`) with a no-cron configuration to close the same API-abuse paths on the public beta host.

Reviewed local `main` commit `b386710432708c931564f9bc8571f198ee52be2d`, matching the local `origin/main` reference for WWalker1/CRL-head-to-head. Scope: web API authorization, Supabase policies and functions, model-service boundaries, dependency advisories, and credential-file tracking. GitHub's web page could not be fetched; this is a review of the matching local repository, not an independently refreshed remote checkout.

Production database checks used read-only catalog queries. No exploit was executed against user records, no database or deployment changes were made, and no credential values were collected in this report.

## 1. High: anonymous callers can change another account's rivalry counters

Source: `supabase/migrations/002_increment_function.sql:2–27`.

`increment_win` and `increment_loss` run as SECURITY DEFINER and accept a caller-supplied user UUID and friend tag without validating ownership. Production catalog inspection confirms both functions still have this definition and both `anon` and `authenticated` have EXECUTE permission. A caller who knows a target UUID and tracked friend tag can invoke the database RPC directly and repeatedly increment that target's totals, bypassing table row-level security. This does not require the application's authenticated routes.

Remediation: revoke EXECUTE from PUBLIC, anon, and authenticated; grant only to service_role, which is what the sync code uses. Set an explicit safe search_path and qualify table names. Verify unprivileged RPC denial and continued server sync afterward.

## 2. Medium: users can fabricate authoritative scores through the database API

Sources: `supabase/migrations/001_initial_schema.sql:57–63`, `supabase/migrations/004_add_elo_ratings.sql:25–31`.

Owner-scoped row policies permit INSERT and UPDATE without restricting authoritative columns. Production catalog checks confirm authenticated INSERT/UPDATE permissions, including UPDATE of tracked_friends.total_wins, tracked_friends.total_losses, and user_ratings.elo_rating. A user can bypass the web routes to supply arbitrary counters and ratings for their own rows. The server's rivalry-share route then publishes these stored totals as trusted scores. Row ownership prevents direct cross-account edits through these policies but does not establish score integrity.

Remediation: restrict authoritative writes to service_role. Preserve the dashboard's own-row SELECT access. Friend creation/deletion already have authenticated server routes; use explicit allowed-column permissions or server routes for any remaining legitimate client writes. Check INSERT as well as UPDATE so scores cannot be supplied during row creation.

## 3. High: an unverified player tag controls cross-account rating writes

Sources: `app/api/sync-battles/route.ts:26`, `utils/battleProcessor.ts:85–88`, `utils/battleProcessor.ts:433–438`.

Sync treats `user.user_metadata.player_tag` as the player's identity. That metadata can be changed by the account holder, and signup only checks that a game tag exists; it does not prove ownership. The privileged sync worker copies this tag into user_ratings, then updates every rating row matching the supplied player tag. An attacker can claim another player's tag, track an opponent from that player's recent public log, and trigger eligible battle processing that writes the attacker's calculated rating to the real player's account as well. Existing same-tag deduplication can skip already-recorded battles, but does not authorize the tag or protect fresh ones.

Remediation: scope rating writes to the authenticated user ID until game-account ownership is verified. Treat supplied game tags as unverified selections. If shared player ratings are intentional, maintain a separate server-controlled player identity/rating record and require a trusted ownership process before allowing account actions to control it. Do not rely on moving the editable tag to another client-writable column.

## 4. Medium: expensive refresh endpoints lack server-side quotas

Sources: `app/api/sync-battles/route.ts:32–33`, `app/api/friend-decks/route.ts:31–40`, `lib/history-storage.ts`.

Any valid account can repeatedly call sync and friend refresh. There is no shared per-user cooldown, quota, or in-progress lock before game API calls and database work. With history capture enabled, a sync can fetch logs for up to 15 tracked friends in addition to the owner. Friend refresh also calls history/model insight processing. A single account can create concurrent requests that consume shared game API limits, database capacity, and hosting resources; the public and model endpoint quotas do not cover these routes.

Remediation: enforce a durable per-user refresh cooldown and an atomic in-progress lock before external work. Add bounded concurrency and reuse recent sync results. Preserve the scheduled production cron, with a separate trusted execution path.

## Verification and limits

- Existing focused checks passed: 37 tests across five suites covering cron authentication, sync authorization, user isolation, model access, and anonymous rate limits. These mocked tests do not exercise the live database privilege issues above.
- `npm audit --omit=dev --json` and `npm audit --json`: zero reported advisories at review time. This does not establish that application code is secure.
- Production catalog confirmed findings 1 and 2 using function definitions, function execution privileges, row policies, table permissions, and score-column permissions. Findings 3 and 4 are source-confirmed; their exploit paths were not run against production accounts.
- Current cron authentication requires the configured bearer secret; the older spoofable cron-header issue described in historical notes is fixed in this revision.
- Friend history routes check owner IDs, and public shares select only the snapshot/status with random share IDs and revocation checks.
- Model proxy/service enforce operation allowlists, authentication boundaries, body-size limits, and bounded search/concurrency. No confirmed bypass was found in those reviewed boundaries.
- Tracked credential-file checks found only templates; the local history check found no `.env`, `.env.local`, or PEM paths. This was not an exhaustive Git-history secret scan.
- Python dependency advisories, cloud-wide configuration, and a full authenticated browser penetration test were outside this pass. No claim is made that the repository is vulnerability-free beyond the reported checks.
