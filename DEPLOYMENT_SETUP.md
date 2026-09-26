# Rival Royale setup

The code is ready for configuration. No Supabase migration or Railway deployment is performed by this repository change.

## 1. Supabase

Create a development Supabase project first. In its **SQL Editor**, apply the existing migrations in `supabase/migrations` in numeric order, ending with `007_friend_history_and_rivalry_shares.sql` and `008_model_quotas.sql`. Review and test the development project before applying those two new migrations to production.

In the Supabase project dashboard, copy the **Project URL**, **anon / publishable key**, and **service role / secret key**. Put them in the web app's server environment settings as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The service role key must remain server-side. Set the Supabase Auth site URL and redirect allow list to your web domain.

## 2. Railway model service

Create a Railway service from this GitHub repository. Use the repository root as the build context and set **Dockerfile path** to `models/service/Dockerfile`. The committed `models/release-bundle/` contains the selected model's runtime files; it contains no training archive. Railway needs enough memory for CPU PyTorch and the loaded model. Set `MODEL_SERVICE_TOKEN` to a long random value in Railway variables. Expose the service over HTTPS and copy its public URL. Check `GET /ready` after startup; it should report model version `20260921T223438Z`. The model endpoints require the bearer token and should not be called directly from browser code.

When promoting a new model, export and validate its bundle, replace `models/release-bundle/`, and commit it with the code that supports its schema. Retain the previous release for rollback. Do not copy raw match archives, `.env` files, or service credentials into the bundle.

## 3. Web host

In Vercel (or your Next.js host), add the Supabase variables above plus `CLASH_ROYALE_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL` (the final `https://` web domain), `MODEL_SERVICE_URL` (Railway HTTPS URL), and `MODEL_SERVICE_TOKEN` (exact same value as Railway). Keep the two secret tokens server-side. Set `MODEL_TOOLS_ENABLED=1` and `NEXT_PUBLIC_MODEL_TOOLS_ENABLED=1` only after the model service and migrations work. The web host builds from the `codex/rival-model-product` branch until it is merged.

For local signed-in testing, place the same variables in ignored `.env.local` and use the development Supabase project. Start the model service with `MODEL_BUNDLE` pointing at `models/release-bundle`. `env.template` lists every placeholder. The existing game API uses the RoyaleAPI proxy, so its key must be valid for that route.

## 4. Check the flow

Sign in on a phone-sized browser, add a friend, hover on desktop or tap the deck control on mobile, and refresh history if needed. Open the full deck page, wait for the counter, and tap **Export to Clash Royale** on a phone with the game installed. The deck link imports base cards; verify Evolution, Hero, tower and levels in game. Verify that another account cannot open this friend's private deck page. Existing API logs may contain fewer than 100 eligible matches; the history grows only as it is refreshed or a future scheduled accumulator is added.

The deck builder is tabled. Its prior beta route remains in the branch but is removed from primary navigation and the sitemap. The counter flow uses complete recorded friend decks.
