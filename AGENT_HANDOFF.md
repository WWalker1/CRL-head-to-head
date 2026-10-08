# Rival Royale — start here

Updated 2026-10-07. Read LAUNCH_HANDOFF_2026-10-07.md for the current release checklist and deployment state. The older dated details below document implementation history. The user authorized production promotion after the launch checks pass.

## Goal and current state
Add calibrated Clash Royale deck matchup inference, constrained counter search, iterative deck completion, friend deck histories and shareable rivalry pages to the existing Next.js/Supabase application. Vercel remains the web host; a separate Railway CPU service is planned for inference.

The public beta is deployed from `codex/rival-model-product` at `beta.rival-royale.com`. Production remains on `main`, with the history and cron fixes pushed. Supabase migrations 007–012 were applied to the existing project; see MIGRATION_REPORT.md. Railway and both Vercel projects are deployed. The old protected Vercel Preview has an outdated model token; use the public beta domain for testing.

## Read in order
1. IMPLEMENTATION_REPORT.md — completed work, verification and outstanding checklist.
2. LOCAL_DEVELOPMENT.md — launcher, environment setup, artifact export and signed-in development.
3. IMPLEMENTATION_PLAN.md — detailed architecture and broader future scope.
4. BENCHMARK_RESULTS.md — measured local search performance.
5. models/AGENTS.md and models/DAILY_INGESTION.md — research, data integrity and collection context. Historical counts and scheduler status must be rechecked before reporting them as current.

## Important decisions
- Use the selected two-layer model, run 20260921T223438Z: test accuracy 57.7717% on 48,638 games. A four-layer experiment was worse. No retraining was done during product integration.
- Score complete eight-card decks. Start search with observed seeds, insert required cards, and explore bounded legal replacements; never enumerate the entire deck space.
- Every chosen builder card is mandatory, including its form. The user reported suggestions keeping only one of four selected cards. This is fixed in the request, enforced by search, and checked before displaying results. Regression tests and a real browser check cover four-card preservation.
- Historical opponent frequency is not a live meta estimate. Novel generated decks may exploit model errors; do not call them globally optimal or treat model scores as measured win rates.
- Card-form and special-slot legality are enforced. Keep original training preprocessing and calibrated scoring parity.

## Code map
- components/model-tools and app/{matchup,counter-deck,deck-builder,models}: model UI.
- app/api/model/[action], lib/model-access: server proxy, authentication, limits.
- models/service: portable CPU model API and bounded search; models/export_bundle.py: artifact export.
- lib/friend-history, app/api/friend-decks, components/FriendInsights: normalized latest-100 history and top decks.
- app/api/rivalry-shares, app/rivalry, lib/rivalry-sharing: revocable public snapshots and social images.
- supabase/migrations/007* and 008*: history/shares and model quotas, awaiting development-database verification.
- scripts/start-model-preview.ps1: model-only local preview without Supabase.

## Artifacts and secrets
Git includes source, tests, migrations, plans and launch scripts. It deliberately excludes datasets, model weights, virtual environments, logs and .env files. The current portable bundle is models/data/bundle in the local worktree. The original selected run and export are under C:/Users/22wes/Programming Projects/head-to-head-royale/models/data; LOCAL_DEVELOPMENT.md gives exact paths and export instructions. A different machine needs these trusted artifacts transferred separately; cloning source alone does not supply weights. Do not publish player-level archives.

## Next steps and requested access
The existing Supabase project has the new schema. Preview branching was unavailable without a paid plan, so migrations were tested in rollback transactions and applied to the existing project at the user's direction. Railway and Vercel are connected. Verify signed-in friend and skill flows, bounded history, cron, quotas, share revocation and mobile UI before production promotion. Save secrets only in ignored local environment files or hosting dashboards. No credentials should appear in chat or commits.

History accumulation runs through manual and existing daily sync when MATCH_HISTORY_ENABLED=1. The player's own archive and friend archive retain at most 100 eligible full rows per tracked subject; compact deck totals persist since tracking began. Matchup skill compares actual wins with versioned, supported post-training-cutoff estimates. See DEPLOYMENT_SETUP.md and LAUNCH_HANDOFF_2026-10-07.md for current setup, verification and release gates. The 2026-09-25 test and deployment claims elsewhere in this older handoff are historical.
