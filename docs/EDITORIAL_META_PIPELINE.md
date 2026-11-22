# Rival Royale editorial automation (branch-only prototype)

## Scope / safety

This work adds templates and an opt-in weekly collector. It does **not** change a running Railway job, live Supabase schema, production Vercel settings, production routing, or any existing R2 object. The collector is read-only against the game API by default. R2 writes require the explicit `--publish` flag. The GitHub Actions job will not run its collector unless the repository variable `ENABLE_EDITORIAL_WEEKLY_META=true`. Scheduled GitHub Actions workflows only execute on the default branch, so this feature branch cannot schedule live runs.

## Components

- `scripts/editorial/weekly_meta.py`: snapshots up to 250 current global Ranked leaderboard players; reads recent battle logs, filters unmodified constructed 1v1 Ranked mode, de-duplicates by physical match and sampled player tag, computes deck usage and observed win rates, outputs JSON locally, and optionally uploads to R2.
- `scripts/editorial/test_weekly_meta.py`: offline unit tests for mode/time filtering, deck identity, duplicates, and wins.
- `lib/editorial-meta.ts` + `app/meta/page.tsx`: mobile-first leaderboard report template consuming published JSON. Shows an explicit unpublished state until R2 is connected.
- `lib/editorial-articles.ts` + `app/editorial/[slug]/page.tsx`: structured text-only article template for monthly meta commentary, balance changes, and strategy. No arbitrary HTML, generated executable code, or raw Markdown execution.
- `.github/workflows/editorial-meta-weekly.yml`: opt-in Monday 08:00 UTC job; no job execution until approval and configuration.

## Collection methodology

Official battle logs only include recent matches, not the full past week. Therefore results are a **recent-match convenience sample from sampled high-ranked players**, not a census of all top ladder games or an unbiased deck-strength leaderboard. The cohort is selected from a snapshot of global Ranked ranks; opponent ranks vary. The collector filters `pathOfLegend`, mode ID 72000464, collection decks, 8 unique cards, one-on-one decisive games, no modifiers, and a trailing 7-day timestamp window. Verify the mode against the current game patch before enabling publication; new modes must fail closed. It counts one observation per leaderboard player per physical match. If two sampled leaderboard players face each other, there are two player-deck observations (one win and one loss), and the methodology reports that explicitly. Usage = qualifying deck appearances / qualifying appearances; win rate = wins / decisive appearances. A deck with <5 observed games is omitted. Interpret rates cautiously and display sample sizes. The code does **not** independently establish that a deck is the 'best' or that balance changes caused any outcome.

## Local verification

```bash
python -m unittest discover -s scripts/editorial -p 'test_*.py'
npm test -- --runInBand
npx tsc --noEmit
npm run build
```

A dry-run collector fetches live recent matches and writes only a local file (requires a valid game API key; the proxy must accept the key):

```bash
CLASH_ROYALE_API_KEY=... python scripts/editorial/weekly_meta.py --top 25 --min-games 2 --out meta-preview.json
```

Do not commit `meta-preview.json` or any raw battle logs; delete generated local artifacts after review. Do not run this concurrently with an existing high-throughput collector if it would breach the shared game API budget.

## R2 setup (not performed)

Use an isolated bucket/prefix with least-privileged object write credentials. Do **not** give read access to sensitive or user-level match archives. The report is aggregated and intentionally contains no player tags. Configure repository secrets `CLASH_ROYALE_API_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and repository variable `R2_EDITORIAL_BUCKET`. The publisher writes `editorial/meta/latest.json` and `editorial/meta/YYYY-MM-DD.json` into the configured bucket. Configure Vercel's server environment variable `R2_EDITORIAL_PUBLIC_BASE_URL` to a public-read HTTPS R2 custom domain exposing only editorial objects; do not use an unauthenticated public domain for an existing private gameplay archive. On an existing private bucket, use a separate public bucket or build a narrowly scoped authenticated server-side reader instead.

For a manual upload, install `boto3`, supply the four R2 variables and API key, run `python scripts/editorial/weekly_meta.py --publish`. Only enable `ENABLE_EDITORIAL_WEEKLY_META` after reviewing a real dry-run, API load, and the public domain. Automatic deployment of the actual page code still requires an explicit code merge; **do not merge without approval**.

## Editorial template JSON

Upload a JSON object to `editorial/articles/<slug>.json`, for example:

```json
{
  "schemaVersion": 1,
  "slug": "december-2026-balance-changes",
  "kind": "balance-changes",
  "title": "Clash Royale December 2026 Balance Changes: What Changed",
  "description": "An evidence-based review of the December game adjustments and how they affect common Ranked deck choices.",
  "author": "Rival Royale Editorial",
  "publishedAt": "2026-12-02T12:00:00Z",
  "updatedAt": "2026-12-02T12:00:00Z",
  "sources": [{"label": "Official Clash Royale release notes", "url": "https://supercell.com/en/games/clashroyale/"}],
  "sections": [
    {"heading": "What changed", "paragraphs": ["Replace this placeholder with verified patch facts and citations."]},
    {"heading": "What we observed", "paragraphs": ["Replace this placeholder with cohort statistics and clear uncertainty."]}
  ]
}
```

**The above is a schema illustration only, not a verified December patch article and must not be published unchanged.** Source links should point to exact relevant official patch pages, and statistical claims should be grounded in dated snapshot IDs. LLM generation may propose headlines/explanations but should never invent card changes, usage percentages, match results, or citations. A human should initially approve balance-change articles. Avoid copying competitor prose/assets; use their navigation/content organization as design reference only.

## Before activation

1. Run the offline tests, TypeScript, full test suite and a preview build.
2. Check the latest Supercell Ranked mode metadata and exact filtering rules.
3. Dry-run against 25 players; validate API 429 handling and snapshot integrity.
4. Review mobile layouts at 320, 375, 768 and 1280 pixels, dark mode, card-image origin and content access.
5. Create an editorial-only R2 location and public-read URL. Confirm it cannot read unrelated private objects.
6. Add dashboard/guide navigation links, sitemap entries, and archive policy **only after** the feature is approved.
7. Decide a minimum useful sample threshold and retention plan; 100 observations is merely a protective initial gate, not statistical assurance.
8. Keep collection as a separate GitHub Actions job; do not add another Railway cron or overlap existing heavyweight model dataset collection.

## Competitor references (concepts, not copied content)

- RoyaleAPI popular decks: filters for popularity and win-rate dimensions.
- Deck Shop best decks: recognizable card grids, deck attributes, patch/meta freshness.
- Rival Royale should differentiate through transparent denominators, provenance, original analysis, and links into its existing friend matchup tools.
