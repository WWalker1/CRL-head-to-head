# Ranked editorial reports

## Development preview

Open /meta, /meta/november-2026 and /editorial/october-2026-balance-changes. The development fallback is a real November 22 collection with 250 successful logs, 5,480 physical matches and 6,501 player appearances. Its twelve displayed lists preserve the original denominator. The November sample and its weekly window coincide. Additional months return 404 until collected. The fallback is available only in development, Vercel Preview or an explicitly enabled local verification build. Preview robots directives discourage indexing.

## Run a collection

Use Python 3.12+, an authorized CLASH_ROYALE_API_KEY for the RoyaleAPI proxy, and:
```sh
python -m unittest discover -s scripts/editorial
python scripts/editorial/weekly_meta.py --top 250 --out /tmp/weekly.json --archive-dir /tmp/months
```
One leaderboard request, one catalog request, then at most one log per selected player before retries. Sequential concurrency and a 200 ms inter-log delay limit load. Draws, modified battles, non-collection decks, unknown forms, malformed 1v1 sides and matches outside the half-open UTC window are excluded. IDs incorporate both player tags, time, battle type and mode. A battle between two sampled players contributes one physical match and two deck appearances when both logs contain it. Neither tags nor opponent histories enter report JSON. Exact eight-card identities include active forms 0/1/2. Tower troops are not part of the eight-card identity. Elixir is unavailable for lists with missing or variable card costs. Minimum five appearances to display; usage order takes precedence over win rate. The strongest displayed result requires at least 30 appearances. Repeated players, bounded logs and cohort selection limit inference.

## Archive and monthly aggregation

With --publish, the window ends at the most recent Monday 00:00 UTC. Use the scheduled Monday 08:00 UTC collection for timely coverage. A late retry can lose history; never backdate collection time. Collection refuses a sample below 90% leaderboard coverage, excessive log failures, fewer than 100 appearances or no qualifying lists. Each report stores the actual observation dates. The development archive contains no private player data:
- editorial/meta/weeks/YYYY-MM-DD.json is an immutable weekly snapshot plus complete deck histograms split at UTC calendar boundaries.
- editorial/meta/latest.json is a chronological pointer containing the latest display report.
- editorial/meta/months/YYYY-MM.json pools all winning/losing appearances from disjoint weekly slices, including lists below the weekly threshold. Percentages are recalculated from counts.
- editorial/meta/index.json contains discoverable archive months.

Replaying a finished week reuses its original archive. ETag-conditional writes and create-only archive puts make interrupted runs recoverable and reject conflicting concurrent writes. After an interrupted or conflicting write, use `python scripts/editorial/weekly_meta.py --publish --resume-week YYYY-MM-DD` with the Monday UTC end date. This rebuilds from the original archive without calling the game API. The one-off November 22 preview archive is a rolling validation sample, outside the scheduled week archive. Do not mix overlapping samples. More frequent collection would require a private incremental observation store and cross-run deduplication before combining counts.

## Credentials and rollout

The collector permits only rival-royale-editorial-dev. Give its S3 credential Object Read & Write scoped to that one bucket. Set R2_EDITORIAL_BUCKET (repository variable), R2_ACCOUNT_ID, R2_EDITORIAL_ACCESS_KEY_ID and R2_EDITORIAL_SECRET_ACCESS_KEY (secrets). The Next.js reader uses separate bucket-scoped Object Read credentials R2_EDITORIAL_READ_KEY_ID and R2_EDITORIAL_READ_SECRET, plus account ID and bucket. It signs server-side requests and caches precomputed objects for 15 minutes. Keep the bucket private. Never use history credentials. The Actions collector remains gated on ENABLE_EDITORIAL_WEEKLY_META=true; scheduled workflows also require the default branch. The verification workflow needs no credentials and has no schedule.

Production activation requires explicit approval, a new dedicated editorial bucket, a reviewed bucket allowlist change, production read-only credentials, separate protected publisher credentials, an initial accepted dataset and a verified preview of the intended report. Check sitemap, canonical origin, archive and failed-read behavior. Review the first scheduled collection before indexing. Roll back by disabling the editorial workflow and restoring the previous approved report via a reviewed release.

## Add content

Monthly summaries need no React edits. Publishing a valid new week regenerates every affected month, its archive index, and its sitemap entries. For balance coverage, verify the effective date and each change against an official Supercell release, then create a reviewed packet under content/editorial/evidence. Supply its facts, timestamp and outline.schema.json to an AI editor. Ask it to select and order only evidence IDs. It may draft new language for human source verification in the packet before compilation. The compiler rejects unknown or repeated claims, invented fields and sources outside the official hosts. Separate confirmed changes, measured observations and strategies. With no matched pre/post sample, say so explicitly. No paid model call is required.
```sh
python scripts/editorial/compile_article.py evidence.json --brief > /tmp/editor-brief.json
python scripts/editorial/compile_article.py evidence.json outline.json /tmp/article.json
```
Review the rendered draft, then approve by committing compiler output under content/editorial/approved and registering it in lib/editorial-articles.ts. New individual articles share the server-rendered template. To add a new article type, define its evidence schema, required sections, compiler and tests, extend the registered union and render only validated fields. Metrics belong in the collector, outside generated prose. The approved registry drives sitemap inclusion.

## Verification and operating cost

The PR verification workflow runs Python, TypeScript, Jest, a Next.js build and Chromium checks at widths 320, 375, 390, 768 and 1440. Its screenshots include light/dark viewports and complete first-deck crops. Check eight decoded assets, HTTP status, canonical tags and overflow. Downloads expire after 14 days.

At four to five 250-player runs per month, budget roughly 1,000–1,300 upstream calls before retries, a few dozen object writes and tens of CI minutes. R2 Standard includes 10 GB-month, 1M Class A and 10M Class B operations account-wide; budget $0 marginal while under shared allowances. Beyond these, storage is $0.015/GB-month. Measured private runner minutes and optional AI usage depend on account plan. No always-on worker is needed.

## Design references

RoyaleAPI puts the time range, game count and raw results beside deck lists. Deck Shop connects card forms with a player's next action, while Deck AI makes playlist and league context explicit. Rival Royale uses a narrower global Ranked cohort, puts its denominator on the page and links into its existing matchup tools. Sources reviewed: https://royaleapi.com/decks/popular, https://www.deckshop.pro/deck/finder, https://deckai.app/guide and https://deckroyale.gg/. A separate Clash Royale site at deck.gg could not be verified. No competitor statistics or assets enter the pipeline.
