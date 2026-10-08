# Rival Royale launch handoff — October 7, 2026

## October 8 verification update

- **Security follow-up:** Migration 017 is applied and live privileges were verified. Security release code protects user-triggered game API requests with shared durable budgets, a per-account refresh cooldown, and expiring request locks; removes tag-based cross-account rating writes; and preserves existing ratings when adding friends. The production nightly cron is unchanged. See `SECURITY_REVIEW_2026-10-08.md` and `MIGRATION_REPORT.md`. Verification passed 163 JavaScript tests, TypeScript, the production build, 12 Python service tests, and rollback SQL checks. Recheck Vercel's deployment SHA when resuming.

- **Production release completed:** commit `fd2e66d` is on `origin/main` and Vercel deployment `dpl_8QbAFm11QcfaJ116sQqmXc7zmxD8` is Ready at <https://rival-royale.com>. Live smoke checks returned HTTP 200 for `/`, `/counter-deck`, `/clash-royale-skill-score`, `/api/model/catalog`, `/api/model/examples`, `/sitemap.xml`, and `/robots.txt`.
- Vercel still reports one production cron, `/api/cron/sync-all-users` at `0 2 * * *`. Watch its next automatic run; the successful manual run below is the current evidence for the end-to-end sync. A signed-in friend skill page walkthrough and a new counter POST remain useful follow-up checks; the anonymous browser could not perform the former, and the shared tester IP had reached its three-search quota for the latter.

- The beta UI is integrated with production's cron retry and history deduplication fixes on `codex/production-launch`. The merge keeps the production `vercel.json` nightly cron. Its Clash API calls combine retry on HTTP 429 with a ten-second request timeout.
- The integrated branch passed 149 JavaScript tests in 26 suites, TypeScript checking, and a production build with placeholder build credentials. The production dependency audit found zero vulnerabilities. The beta model Python suite passed 51 tests before integration; no Python model files had merge conflicts.
- The live production cron endpoint was invoked with its configured secret and completed for 1,161 of 1,161 users, with zero failures and 181 new battles. This confirms the endpoint and credentials; the scheduled 02:00 UTC run still needs its next automatic execution observed. Existing friend win/loss totals increased after the run.
- Database inspection found 18,963 player and 20,452 friend full match rows. The largest per-subject windows were 60 and 69 respectively, below the enforced cap of 100. Migration 016 bounds compact deck totals to 1,000 per subject. Migrations 013–016 and the friend limit were present in the live database.
- Railway's readiness endpoint and authenticated model catalog responded successfully. The public beta landing pages were inspected at 390-pixel phone width with visible card art. A fresh anonymous counter search hit the configured three-per-day quota for the shared tester IP, so that exact live action was not independently verified this run. The signed-in friend page was tested by route and component tests and backed by live data inspection, but could not be inspected in the anonymous browser session.
- The production Vercel project has now been given its Railway URL/token, model feature flags, public site URL, and rivalry share origin. Its existing Supabase, Clash API, history, and cron settings remain in place.

Read this first when resuming the work at 12:15 a.m. Eastern on October 8. This document supersedes dated status claims in older plans and reports; those files retain useful design and test detail.

## Current sites and branches

- Public test site: <https://beta.rival-royale.com>. The current counter page is <https://beta.rival-royale.com/counter-deck>. The older `crl-head-to-head-git-...vercel.app` Preview is protected and its model proxy returns `{"error":"Unauthorized"}` because that immutable deployment has an outdated Railway token. Do not send testers there. The public beta catalog and examples APIs returned HTTP 200 on October 7.
- Production: <https://rival-royale.com>, served from `main`. Do not assume the beta UI is already on production. The nightly Vercel cron at 02:00 UTC must remain enabled.
- Beta source: `codex/rival-model-product`, pushed commit `cf5e269` at this handoff. The public beta project was deployed from that commit. Its `vercel.beta.json` has no cron, avoiding duplicate collection.
- Production history/cron fixes: `codex/history-capture-main`, pushed commit `c82ace5` to its branch and `origin/main`. Verify the current Vercel production deployment and a fresh cron result before the UI promotion.
- Railway CPU model service is live. Web model calls go through the Next.js proxy and require matching `MODEL_SERVICE_TOKEN` values in the hosting environments. Keep values out of docs, output, and Git.
- Existing Supabase project is shared by production and beta. Migrations 007–012 were applied; see `MIGRATION_REPORT.md`. There is no paid preview database branch.

## Product decisions

- Preserve the main page's current lighter color palette and overall appearance. Friend win/loss tracking remains the primary entry point. Keep the visible player-tag photo guide and mobile-first layouts.
- The counter finder is its own landing page; the skill score has a separate page. An arbitrary complete eight-card deck can be entered visually, and generated counter decks have Clash Royale export links. Three anonymous counter searches per visitor per day are allowed; public reads also have limits. Logged-in users may track at most 15 friends.
- The iterative deck completer remains tabled and is not part of this launch.
- Store only the newest 100 eligible full match rows per owner/player relationship. Compact per-deck totals and the top five most-played decks can persist since tracking began. Existing lifetime friend win/loss aggregates must remain independent of this pruning. Eligible constructed standard 1v1 modes include Classic/Grand Challenge; draft and altered decks are excluded.
- The separate *local research* daily-rank ingestion is paused. The live Vercel nightly sync is required for the site and must stay on.
- The score is model-relative performance against expected wins for the latest supported recorded games. It currently uses the more expressive scale introduced in `cf5e269`; check the actual implementation before updating explanatory text. Do not call it a pure player-skill measurement or claim model probabilities are observed win rates.

## User requests for the next run

1. Remove the literal model build/version string from the public “About these stats” presentation. Keep versioning in stored predictions and internal diagnostics.
2. Clicking a tracked friend's recent record/skill should open a full player skill view that matches the user's own matchup skill UI: prominent score, best tough win, toughest favored loss, and deck context. Protect private friend data and make back navigation clear. Do not replace the simple win/loss dashboard.
3. Add useful, naturally written public answer copy about “How do I know if I'm good at Clash Royale?”, “Am I better than my friend?”, and related counter-deck intent to the appropriate landing/info pages. Keep the page visual and concise; avoid an unsubstantiated “#1 rated” claim or keyword stuffing.
4. Draft a couple of distinct Reddit launch posts using the “am I good / better than my friend” angle. Save drafts only; do not publish. Check current community rules before later posting.
5. Verify the full launch gate below. If clean, promote the beta UI to production. Report any concrete blocker before promotion. The user's approval to proceed is in the October 7 conversation, conditional on passing tests and checks.

## Launch gate

- Run the full JavaScript tests, typecheck, production build, and relevant Python model tests after edits. Record exact counts and failures; do not rely on old reported counts.
- Verify live signed-in friend add/list, skill navigation, friend history/decks, counter search, export, and share flows on a narrow phone viewport as well as desktop. The previous screenshot showed intermittent card art; recheck image loading.
- Verify a fresh production nightly cron result after the Clash API key and retry fix. The RoyaleAPI proxy key is IP constrained; do not replace it with a standard key meant for Vercel's dynamic addresses. A prior manual cron run captured 641 new battles with 1,154 of 1,159 users succeeding, and the remaining 429/retry failures motivated `c82ace5`. This is not proof the next scheduled run succeeded.
- Check that latest full history remains bounded at 100 rows per owner/player or owner/friend relationship and that compact deck totals do not grow as raw match archives. Confirm existing friend wins/losses are unchanged by pruning.
- Verify beta and production configuration separately. Promoting the UI must preserve the production cron, production Supabase settings, `MATCH_HISTORY_ENABLED`, and the working Railway and RoyaleAPI credentials. Do not deploy the beta project's no-cron `vercel.beta.json` to the production project.
- Check current Railway spend/limits and service availability before launch. The user believes a $10 spending limit is set; this has not been independently confirmed.

## Documentation map

`AGENT_HANDOFF.md` is the earlier detailed handoff; `IMPLEMENTATION_PLAN.md` covers architecture and unresolved model work; `DEPLOYMENT_SETUP.md` covers hosting and environment setup; `MIGRATION_REPORT.md` records applied schema; `TESTING.md` contains test commands; `LAUNCH_COMMUNITY_POSTS.md` contains unpublished draft copy. Older dated status statements in those files should be read through this current handoff.
