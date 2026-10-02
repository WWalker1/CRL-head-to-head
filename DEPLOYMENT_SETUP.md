# Rival Royale setup

The code is ready for configuration. As of October 1, 2026, the existing Clash-Royale Supabase project has the baseline application tables but none of feature migrations 007–009. No Supabase migration or Railway deployment has been performed by this repository change.

## 1. Supabase

Use the existing Supabase project. A second permanent project is not required. Codex will inspect the live schema, test the pending SQL in an isolated development environment when available, then apply and verify migrations `007_friend_history_and_rivalry_shares.sql`, `008_model_quotas.sql`, and `009_player_history_and_matchup_skill.sql` in that order. The baseline 001–006 migrations already have corresponding tables in the existing project and must not be replayed blindly. The current project does not expose a migration-history table or an available backup through the Management API, so check the recovery path before changing its schema. The user does not need to run SQL in the dashboard.

In the Supabase project dashboard, copy the **Project URL**, **anon / publishable key**, and **service role / secret key**. Put them in the web app's server environment settings as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The service role key must remain server-side. Set the Supabase Auth site URL and redirect allow list to your web domain.

## 2. Railway model service

Create a Railway service from this GitHub repository. Use the repository root as the build context and set **Dockerfile path** to `models/service/Dockerfile`. The committed `models/release-bundle/` contains the selected model's runtime files; it contains no training archive. Railway needs enough memory for CPU PyTorch and the loaded model. Set `MODEL_SERVICE_TOKEN` to a long random value in Railway variables. Expose the service over HTTPS and copy its public URL. Check `GET /ready` after startup; it should report model version `20260921T223438Z`. The model endpoints require the bearer token and should not be called directly from browser code.

When promoting a new model, export and validate its bundle, replace `models/release-bundle/`, and commit it with the code that supports its schema. Retain the previous release for rollback. Do not copy raw match archives, `.env` files, or service credentials into the bundle.

## 3. Web host

In Vercel (or your Next.js host), add the Supabase variables above plus `CLASH_ROYALE_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL` (the final `https://` web domain), `MODEL_SERVICE_URL` (Railway HTTPS URL), and `MODEL_SERVICE_TOKEN` (exact same value as Railway). Keep the two secret tokens server-side. Set `MODEL_TOOLS_ENABLED=1` and `NEXT_PUBLIC_MODEL_TOOLS_ENABLED=1` only after the model service and migrations work. The web host builds from the `codex/rival-model-product` branch until it is merged.

For local signed-in testing, place the same variables in ignored `.env.local` and use the development Supabase project. Start the model service with `MODEL_BUNDLE` pointing at `models/release-bundle`. `env.template` lists every placeholder. The existing game API uses the RoyaleAPI proxy, so its key must be valid for that route.

## 4. Check the flow

Sign in on a phone-sized browser, add a friend, hover on desktop or tap the deck control on mobile, and refresh history if needed. Open the full deck page, wait for the counter, and tap **Export to Clash Royale** on a phone with the game installed. The deck link imports base cards; verify Evolution, Hero, tower and levels in game. Verify that another account cannot open this friend's private deck page. Existing API logs may contain fewer than 100 eligible matches; enable history capture as described below to accumulate available logs over time.

The deck builder is tabled. Its prior beta route remains in the branch but is removed from primary navigation and the sitemap. The counter flow uses complete recorded friend decks.

## 5. Persistent history and matchup skill

After Codex applies and verifies migration 009, set `MATCH_HISTORY_ENABLED=1` on the web host. Manual **Sync Battles** and the existing daily sync then archive the account owner's eligible matches and fetch each tracked friend's recent log. Rows are deduplicated and retained; the latest 100 is a summary window, not an archive deletion rule. Deleting an account deletes its archive; removing a friend deletes that tracked relationship's history. Unknown/modified modes, draft, 2v2 and malformed records are not part of this normalized 1v1 archive. The short API log cannot reconstruct older games already missing before capture. Daily capture may miss active players' games; increase the scheduler frequency within the host's limits if more complete coverage is needed, and measure API/database load.

Redeploy the Railway service for `/score-history` and the extended `/ready` metadata. The website scores recent decisive Ranked records after the model's training cutoff, excluding unsupported/low-support decks and draws. Stored predictions include model version and cutoff; versions are not mixed. No outcome is sent to the predictor. The current score uses the latest 100 captured records: `50 + 50 × (actualWins − expectedWins) / (scoredMatches + 20)`, bounded to 0–100. A score of 50 means performance matches deck-model expectations. The 20-match neutral prior reduces small-sample swings. Fewer than 30 scored games is provisional. Tough-matchup wins are wins with model probability below 40%.

This is a model-relative performance measure, not a pure causal skill rating. It does not account for opponent skill, matchup familiarity, or future balance changes, and it leaves the existing Elo rating intact. Supabase RLS and real signed-in integration still need verification on the development project; no live migration has been applied here.
