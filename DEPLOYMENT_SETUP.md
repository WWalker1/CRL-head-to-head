# Rival Royale setup

Migrations 007–009 were applied to the existing Clash-Royale Supabase project on October 1, 2026. See MIGRATION_REPORT.md for the precheck, rollback test, application, and verification. The Railway model service is deployed. The existing Vercel project's Preview branch and the separate public beta project are configured. The main production site remains on `main`.

## 1. Supabase

Use the existing Supabase project. A second permanent project is not required. Codex applied migrations `007_friend_history_and_rivalry_shares.sql`, `008_model_quotas.sql`, and `009_player_history_and_matchup_skill.sql` in one transaction. The baseline 001–006 migrations already have corresponding tables and must not be replayed blindly. The current project does not expose a migration-history table or an available backup through the Management API; MIGRATION_REPORT.md records the applied file hashes. The user does not need to run SQL in the dashboard.

In the Supabase project dashboard, copy the **Project URL**, **anon / publishable key**, and **service role / secret key**. Put them in the web app's server environment settings as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The service role key must remain server-side. Set the Supabase Auth site URL and redirect allow list to your web domain.

## 2. Railway model service

Create a Railway service from this GitHub repository and select branch `codex/rival-model-product`. In the service settings, leave **Root Directory** blank (repository root), select the **Dockerfile** builder, and set **Dockerfile Path** to `models/service/Dockerfile`. Railway also accepts the service variable `RAILWAY_DOCKERFILE_PATH=models/service/Dockerfile` for that path. Do not set a custom build or start command; the Dockerfile starts `python -m service`, which listens on Railway's `PORT`. If Railway builds the Next.js app or reports missing `models/service/requirements.txt` or `models/release-bundle`, check the branch, root directory, and Dockerfile path first.

Use GitHub-connected deployment for this service. The committed `models/release-bundle/` contains the selected model's runtime files; it contains no training archive. Railway needs enough memory for CPU PyTorch and the loaded model. Set `MODEL_SERVICE_TOKEN` to a long random value in Railway variables. Set the service healthcheck path to `/ready`, generate a public HTTPS domain, and copy its base URL. The current model service URL is `https://crl-head-to-head-production-12d1.up.railway.app`. Its domain targets the Railway-provided app port 8080. Check `GET /ready` after startup; it should report model version `20260921T223438Z`. The model endpoints require the bearer token and should not be called directly from browser code.

When promoting a new model, export and validate its bundle, replace `models/release-bundle/`, and commit it with the code that supports its schema. Retain the previous release for rollback. Do not copy raw match archives, `.env` files, or service credentials into the bundle.

## 3. Web host

The existing `crl-head-to-head` Vercel project builds `codex/rival-model-product` as a protected Preview. Its branch-scoped Supabase, Clash API, Railway, model/history flags, and `RIVALRY_PUBLIC_ORIGIN=https://beta.rival-royale.com` are configured. Its branch alias is `https://crl-head-to-head-git-codex-riva-121930-wwrens-projects-9530f2aa.vercel.app`; ordinary friend share URLs are generated on the public beta domain rather than that protected alias.

The separate `rival-royale-beta` Vercel project serves `https://beta.rival-royale.com` publicly from this branch, using the same existing Supabase project and Railway model service. It has its own Production-scoped variables, including `NEXT_PUBLIC_SITE_URL` and `RIVALRY_PUBLIC_ORIGIN` set to the beta domain. The beta deployment uses `vercel.beta.json`, which omits the main project's scheduled sync, so testing does not launch a second collector. The beta domain's `/reset-password` URL is in Supabase Auth's redirect allow list. Beta is intentionally `noindex` until a reviewed release is promoted to the main site. The beta project is manually deployed; a branch push alone updates the protected Preview, not the public beta. To update beta from this checkout, link to `rival-royale-beta`, run `vercel deploy --prod --local-config vercel.beta.json`, then relink the checkout to `crl-head-to-head`. Keep `rival-royale.com` on `main` until acceptance.

For local signed-in testing, place the same variables in ignored `.env.local` and use the development Supabase project. Start the model service with `MODEL_BUNDLE` pointing at `models/release-bundle`. `env.template` lists every placeholder. The existing game API uses the RoyaleAPI proxy, so its key must be valid for that route.

## 4. Check the flow

Sign in on a phone-sized browser, add a friend, hover on desktop or tap the deck control on mobile, and refresh history if needed. Open the full deck page, wait for the counter, and tap **Export to Clash Royale** on a phone with the game installed. The deck link imports base cards; verify Evolution, Hero, tower and levels in game. Verify that another account cannot open this friend's private deck page. Existing API logs may contain fewer than 100 eligible matches; enable history capture as described below to accumulate available logs over time.

The deck builder is tabled. Its prior beta route remains in the branch but is removed from primary navigation and the sitemap. The counter flow uses complete recorded friend decks.

## 5. Persistent history and matchup skill

Set `MATCH_HISTORY_ENABLED=1` on the web host only after the new web code and model service are deployed and signed-in integration passes. Manual **Sync Battles** and the existing daily sync then archive the account owner's eligible matches and fetch each tracked friend's recent log. Rows are deduplicated and retained; the latest 100 is a summary window, not an archive deletion rule. Deleting an account deletes its archive; removing a friend deletes that tracked relationship's history. Unknown/modified modes, draft, 2v2 and malformed records are not part of this normalized 1v1 archive. The short API log cannot reconstruct older games already missing before capture. Daily capture may miss active players' games; increase the scheduler frequency within the host's limits if more complete coverage is needed, and measure API/database load.

Redeploy the Railway service for `/score-history` and the extended `/ready` metadata. The website scores recent decisive Ranked records after the model's training cutoff, excluding unsupported/low-support decks and draws. Stored predictions include model version and cutoff; versions are not mixed. No outcome is sent to the predictor. The current score uses the latest 100 captured records: `50 + 50 × (actualWins − expectedWins) / (scoredMatches + 20)`, bounded to 0–100. A score of 50 means performance matches deck-model expectations. The 20-match neutral prior reduces small-sample swings. Fewer than 30 scored games is provisional. Tough-matchup wins are wins with model probability below 40%.

This is a model-relative performance measure, not a pure causal skill rating. It does not account for opponent skill, matchup familiarity, or future balance changes, and it leaves the existing Elo rating intact. Supabase policies and grants passed catalog verification; real signed-in integration still needs testing before the feature flags are enabled.
