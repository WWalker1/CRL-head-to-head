# Run the Rival model beta locally

Work in `C:\Users\22wes\.codex\worktrees\rival-model-product\head-to-head-royale` on `codex/rival-model-product`, not the original checkout. No production deployment or Supabase migration has been performed.

## Quick preview: no Supabase credentials needed

In PowerShell:

```powershell
cd 'C:\Users\22wes\.codex\worktrees\rival-model-product\head-to-head-royale'
./scripts/start-model-preview.ps1
```

Open **http://127.0.0.1:3001/deck-builder**, **/matchup**, **/counter-deck**, or **/models**. The launcher uses the existing research Python environment, installs Node dependencies if missing, starts the CPU model service and Next.js, and creates an ephemeral service token. It binds to loopback. Ctrl+C stops the preview. Choose `-WebPort 3002 -ModelPort 8769` if needed. Logs are in ignored `.local/`.

This mode tests real saved-model inference and deck search, without reading root credentials or writing to Supabase. It does not simulate signed-in friend history. `MODEL_LOCAL_PREVIEW=1` only bypasses authentication in development on a loopback URL; production requests require a verified session and durable quota.

## First-time model setup on another checkout

The checkpoint and bundle are ignored artifacts, not committed source. Obtain the selected model run and its associated export from the original research workspace or a trusted artifact store. In this environment the selected run is `C:\Users\22wes\Programming Projects\head-to-head-royale\models\data\runs\20260921T223438Z`.

```powershell
$researchPython = 'C:\Users\22wes\Programming Projects\head-to-head-royale\models\.venv\Scripts\python.exe'
& $researchPython -m pip install -r models/service/requirements.txt
& $researchPython models/export_bundle.py --source 'C:\Users\22wes\Programming Projects\head-to-head-royale\models\data\runs\20260921T223438Z' --destination models/data/bundle
./scripts/start-model-preview.ps1 -Python $researchPython
```

If creating a fresh environment, use a Python version supported by the pinned dependencies, create `models/.venv`, and install that requirements file. Export requires the original dataset catalog/seed artifacts; serving the exported bundle does not require the dataset or database. Do not include training archives or .env files in a container.

## Signed-in history and sharing

Use a **separate Supabase development project** with the existing application schema, then review/apply migrations 007 and 008. Never apply a migration to the live database merely to preview these pages. Add the development project's credentials to ignored `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-DEV-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-DEV-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR-DEV-SERVER-KEY
CLASH_ROYALE_API_KEY=YOUR-API-KEY
CRON_SECRET=YOUR-RANDOM-SECRET
MODEL_TOOLS_ENABLED=1
NEXT_PUBLIC_MODEL_TOOLS_ENABLED=1
MODEL_SERVICE_URL=http://127.0.0.1:8768
MODEL_SERVICE_TOKEN=YOUR-RANDOM-SERVICE-TOKEN
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3001
```

Do not use `supabase_api_key` management tokens as service-role or anon keys. The existing game API integration uses the RoyaleAPI proxy; configure its expected API key correctly.

Start the service in one terminal with the same service token and bundle:

```powershell
$env:MODEL_SERVICE_TOKEN = 'YOUR-RANDOM-SERVICE-TOKEN'
$env:MODEL_BUNDLE = "$PWD/models/data/bundle"
& 'C:\Users\22wes\Programming Projects\head-to-head-royale\models\.venv\Scripts\python.exe' -m uvicorn service.app:app --app-dir models --host 127.0.0.1 --port 8768
```

In another terminal, run `npm run dev -- --hostname 127.0.0.1 --port 3001`. Do not use the preview launcher for authenticated testing. Sign in, add a friend, refresh their history, open a counter, and explicitly create/revoke a rivalry share. Histories accumulate available API records over time; the app cannot recover 100 older games from a short API log. Test a share in a logged-out browser. Public previews expose only the saved snapshot.

## Checks

```powershell
npx tsc --noEmit
npm test -- --runInBand
npm run build
```

Production build requires the existing application's Supabase environment variables. See BENCHMARK_RESULTS.md for measured local inference/search results and the implementation report for known inherited test failures. These local timings are not Railway load-test guarantees.

## Production deployment remains separate

Keep model tools disabled until the service, bundle, authentication, quota migration and target-host benchmarks are verified. Configure Railway's service token explicitly; set the corresponding Vercel server variables. Never enable local preview in production. Use the production site URL for canonical/share metadata. Preserve the previous model bundle for rollback. Training and ingestion are separate from inference deployment.
