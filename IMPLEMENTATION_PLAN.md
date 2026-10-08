# Rival Royale: model-powered product implementation and agent handoff

Plan date: 2026-09-23. Updated: 2026-10-07. Current release status and the user's latest requests are in LAUNCH_HANDOFF_2026-10-07.md. Friend deck and counter flow are implemented; migrations 007–012 were applied; constructed 1v1 history capture and compact deck totals are implemented; Railway model service, protected Vercel Preview and public `beta.rival-royale.com` are deployed. Production remains on `main`; the live Vercel nightly sync remains enabled and the separate local research ingestion job is paused. The iterative deck builder is tabled: its route returns 404 and its web API action is disabled. Sections below retain the full design plan and dated feedback, not a claim that every planned feature is incomplete or awaiting first deployment.

## Preview release gate

Keep Vercel's production branch on `main`. Deploy this branch to the existing project's Preview environment and use its stable branch URL for friend testing. The Preview build needs its own `NEXT_PUBLIC_SITE_URL` matching that URL, the existing Supabase project's public and server keys, the Railway URL and matching service token, and the enabled model/history flags. The exact Preview password-reset URL is now on Supabase Auth's redirect allow list. Preview accounts share the existing Supabase database, so use dedicated tester accounts and review the effect on live records before inviting friends.

The beta should expose the friend's most-played deck and counter, a full friend-deck page, arbitrary complete-deck counter search, a Clash Royale export for every generated counter deck, and opt-in rivalry links for wins/losses with copy/native-share controls. Confirm mobile card picking and results at narrow widths. Keep `/deck-builder` and the `/api/model/complete` proxy action unavailable. Verify metadata, canonical URLs, sitemap, and `noindex` on personal share pages. Only promote to `main` after the user and testers accept the Preview build.

Target a 1–2 hour engineering pass for configuration, focused fixes, and initial mobile smoke tests once Vercel dashboard access is available. Friend testing and any resulting fixes may extend beyond that window.

## October 1 Preview feedback — implemented October 2, awaiting tester acceptance

The user reported the following Preview issues. The fixes are in the beta branch and public beta site; keep the current visual identity and color palette. The public routes and share snapshot were checked at 390px. Signed-in friend and stats flows still need tester acceptance on a phone.

1. **Share links and access:** A generated `/rivalry/[shareId]` link uses the long protected `vercel.app` branch domain, so recipients encounter Vercel sign-in. Provide a short, recognizable, friend-accessible URL that opens the intended public snapshot without Vercel authentication. Review domain/routing options and verify opening from an unsigned-in browser and a phone. Preserve snapshot revocation and `noindex` behavior. Do not treat a project-wide automation bypass token as a sharing link.
2. **Methodology navigation:** The methodology page currently leaves the user unable to navigate away. Reproduce and fix the navigation path, then check browser back, header/menu links, and phone navigation.
3. **Friend deck hover interaction:** Hovering over “See deck and best counter” causes the page or target to shift, making the pointer leave the control. Stabilize the layout and hit target. Use an explicit tap/click path on mobile, where hover is unavailable, and verify the deck and counter can be reached without accidental dismissal.
4. **Product UI review:** Audit the Preview's major flows on desktop and mobile, especially friend deck discovery, counter finder, generated deck display/export, rivalry sharing, spacing, readable type, and touch targets. Fix the concrete usability problems found while retaining the existing color patterns and overall look.
5. **Stats page:** Design a player stats view that highlights recent games where the model rated the player's matchup favorable but the player lost, alongside tough-matchup wins and the skill score. Show the actual result, predicted matchup estimate, deck context, time window, model version, and support/uncertainty so a single prediction is not presented as proof of a mistake. Define the ranking and data-coverage rules against stored full match history before implementation.
6. **SEO and GEO content:** Expand useful, server-rendered public copy and internal links around player skill, finding counter decks, friend deck analysis, and matchup evaluation. Give public pages clear titles, descriptions, structured data where appropriate, canonical URLs, and answer-oriented explanations suitable for search and AI answer engines. The requested “number 1 site” language is a proposed positioning claim; use it only if substantiated, otherwise write strong, accurate benefit-focused copy. Keep private player data and personal rivalry snapshots out of the index.

The new beta domain resolves without Vercel authentication, and the supplied rivalry snapshot returned HTTP 200 with card art, an Open Graph image and `noindex`. Methodology navigation and the counter card picker were checked in a phone-sized browser. Do not promote to the main site until signed-in friend/stats interactions and the Clash Royale export have been accepted on a physical phone.

## October 1 product and model gate

The matchup and counter pages now use visible card art, slot-based selection, search and form filters. Levels and tower troop controls are collapsed by default for a quicker mobile flow. The visual editor does not make the inference model more capable.

Before treating level-adjusted predictions as reliable, run a level-sensitivity suite using identical decks on both sides at several level gaps and compare with level-stratified future match outcomes. A direct release-bundle check with an identical deck at level 11 against level 13 returned approximately 0.499 for the level-11 side, so the current model does not demonstrate the expected level advantage in this case. The UI marks level effects experimental. Keep tournament and ladder cohorts separate when evaluating level effects so equal levels do not silently combine new accounts and tournament play.

Before promoting counter search or untabling the builder, compare observed-deck retrieval, the current two-mutation search and broader diverse proposals at equal compute budgets on a frozen future opponent basket. Search across multiple seeds, record how often each locked card survives, and audit legality, novelty, distinctness, support, score stability and pair coverage. Current generation uses a frequency-filtered card pool and at most two substitutions from observed seeds; it cannot substantiate a claim of finding previously unseen strategies. Validate promising novel decks through prospective playtesting or later real matches, and label them experimental until then. Do not promote a candidate solely because it attains an extreme model score.

## 1. Authorization, purpose, and workspace

October 6 history update: migrations 010–012 extend capture to reviewed constructed 1v1 modes including modern Classic/Grand Challenges. Full match rows are bounded to the latest 100 per owner/player tag and tracked-friend relationship; compact per-deck counts, top five decks, and first/last observation times continue since tracking began. These are not lifetime totals, and older matches lost from the short API log cannot be backfilled. Model-relative skill uses the retained latest-100 full-match window and supported decisive eligible standard 1v1 games after the training cutoff. Capture runs via manual sync and the live Vercel nightly sync when `MATCH_HISTORY_ENABLED=1` in the deployed app. Production remains on `main`, so Preview/beta flags do not enable production capture. Keep the live Vercel cron enabled; only the separate local research ingestion job is paused. See DEPLOYMENT_SETUP.md and MIGRATION_REPORT.md for details.

The user approved moving the experimental matchup predictor into a product beta: friend deck analysis, counter decks, iterative deck building, and shareable rivalry cards. They explicitly requested an isolated worktree and a detailed plan before implementation so another agent can continue. Their main concern is searching the enormous deck space quickly. Do not attempt exhaustive enumeration or promise a globally optimal counter.

Worktree: `C:\Users\22wes\.codex\worktrees\rival-model-product\head-to-head-royale`

Branch: `codex/rival-model-product`.

Original workspace: `C:\Users\22wes\Programming Projects\head-to-head-royale`.

Production application changes are now authorized in this worktree. Earlier language in models/AGENTS.md prohibiting production code changes describes the research phase; the present authorization supersedes it for this worktree. Implement and test locally before deploying. Do not assume credentials authorize unrelated database changes. Migrations 007–009 were applied to the existing Supabase project at the user's direction on October 1, 2026. Railway serves the model at `https://crl-head-to-head-production-12d1.up.railway.app`; Vercel preview builds exist, while the production site remains on `main`.

The original models/ directory was untracked. Its nonignored source, documentation and tests were copied into this worktree. Large datasets, model artifacts, virtual environment and secrets were deliberately not copied. Keep original collection processes and databases undisturbed. Do not start duplicate collectors. User prefers concise updates and low token consumption; use bounded cheaper agents only where useful and explicitly authorized by the research guide.

## 2. Established facts and model state

- App: Next.js 16 / React 19 / TypeScript, hosted on Vercel; Supabase authentication and Postgres.
- Existing integration: lib/clashRoyaleApi.ts calls the RoyaleAPI proxy for player profiles and battle logs. Preserve the working proxy configuration unless migration is tested; API IP restrictions matter for collectors.
- Relevant routes: app/api/add-friend, sync-battles, friend-ratings, cron/sync-all-users; processing in utils/battleProcessor.ts.
- Existing schemas hold tracked friends, user ratings and battle results. They do not provide the complete normalized deck history needed by this feature. Inspect migrations and current schema before designing new migrations; do not infer live schema solely from old migrations.
- Existing vercel.json configures a daily user-sync route. This is distinct from the local research ingestion schedule. A daily sync cannot guarantee capture of every game played between polls.
- Existing layout metadata and sitemap need route-specific improvements; avoid inheriting a homepage canonical for all new pages.
- Best selected model: two self-attention layers plus cross-attention, approximately 125k parameters, permutation-invariant decks and antisymmetric matchup scoring. Inputs include joint card/form identity, normalized level/elixir features and tower troop. No player skill feature is used in the predictor.
- Selected run: original models/data/runs/20260921T223438Z. Test accuracy 57.7717%, log loss 0.6734169, AUC 0.6110765 on 48,638 held-out games.
- Dataset: original models/data/training/20260921T223412Z-a6dffa9e, 486,362 usable games; training 389,089, combined validation/calibration 48,635, test 48,638. Preserve separate validation and calibration halves.
- Four-layer experiment: models/data/runs/20260923T004801Z; 52.26% test accuracy, worse validation. Do not promote it. More layers are not a prerequisite for deployment.
- Primary archive last confirmed 602,819 matches. Community collection sourced 1,999 public player tags from Supabase and fans out through opponents. Last reported 82,987 archived games was an intermediate snapshot, NOT current verified status. Read status/PID before reporting live counts. Community includes modified and unknown modes and is NOT yet merged into training.
- The user declined providing handpicked matchups for tuning. Do not request them again. Evaluate broad future data, calibration and rare-deck behavior.

Read models/AGENTS.md, TRAINING_DATA.md, EXPERIMENT_002.md, EXPERIMENT_003.md, attention_data.py, lab_server.py and counter_search.py before changing inference behavior. README contains historical material; code and frozen manifests govern current behavior.

## 3. Product architecture

Vercel serves pages and authenticated API endpoints. These endpoints validate access, apply quotas and call a Railway CPU inference service using a server-held service credential. Supabase stores normalized histories, deck summaries, saved decks, optional search jobs and explicitly shared rivalry snapshots. The browser must never receive a Supabase management/service key or the inference service secret.

Railway service loads a versioned bundle once at startup: weights, architecture config, frozen vocabulary, catalog, calibration temperature, supported rules and seed decks. Do not ship raw training datasets or assume the original checkpoint's absolute dataset path exists in a container. Export a relocatable bundle with hashes, schema version, training cutoff and model ID. Keep the previous bundle for rollback. Validate readiness only after a known fixture predicts successfully.

Use a production Python API server rather than exposing the research ThreadingHTTPServer. Prefer a small FastAPI service with bounded CPU concurrency. Matchup inference is synchronous. Search has a strict time/candidate budget; return best-so-far results or a job ID for longer work. Never run training on a web request. Add request cancellation, timeouts, input-size limits and structured logs without secrets.

Vercel Python inference remains a possible alternative; benchmark before rejecting it. Railway is the initial recommendation because it simplifies keeping weights loaded and controlling search workers. No GPU is assumed. Actual idle memory and workload cost must be measured; the user's $5 Railway allowance is usage credit, not a guaranteed flat cost for this service.

## 4. Phase A â€” reproducible inference and performance gate

Deliver first: bundle exporter, portable inference module, benchmark script and benchmark report. Keep service setup separate from Next.js routes.

1. Resolve the selected checkpoint in the original workspace read-only. Export only runtime artifacts into ignored worktree storage. Do not duplicate the large archive.
2. Extract preprocessing from lab_server.py into shared tested code; retain exact card/form mapping, normalization, tower handling and calibration. Fix absolute-path assumptions through bundle metadata.
3. Add endpoints: GET /health, GET /ready, POST /predict, POST /counter, POST /complete. Use versioned request/response contracts. Predict takes two complete eight-card decks, forms, levels, towers and supported rules; returns calibrated estimate, model version and support diagnostics. Partial decks go only to completion/search endpoints.
4. Precompute candidate tensors; do not reconstruct Python objects and call tensorize repeatedly in inner search loops. Cache canonical deck representations and score unique candidate/opponent pairs in batches under inference_mode. Begin with PyTorch CPU and controlled thread count. Consider ONNX only if benchmarks justify conversion and prediction parity tests pass.
5. Benchmark warm/cold startup, RSS, batch sizes 1/32/128/512, one matchup, friend mixture of 3 opponents, meta baskets of 20/100/500, and concurrent clients 1/4/8 on the actual intended Railway resource size. Capture p50/p95, throughput, queue delay and maximum memory. No invented latency claims.
6. Provisional UX targets, not measured guarantees: warm single-match server inference p95 <=150ms; network-inclusive prediction <=500ms; bounded initial counter <=2s; refined completion <=5s or background job. Adjust budgets to measured service capacity before promising these publicly.

Acceptance: predictions agree with the frozen implementation within explicit floating-point tolerance; deck permutations do not alter results; swapping decks complements probabilities; unsupported forms and illegal decks are rejected; concurrent load remains within bounded memory/queue limits; model version is present in responses and caches.

## 5. Phase B â€” bounded deck search, not exhaustive enumeration

The current search uses observed seed decks and small mutations with a 1,536-scored-candidate API budget; seed construction can retain 4,000 frequent decks. It does not merely rank exactly 1,500 fixed decks. It currently limits changes from observed seeds and has a fixed heuristic penalty. Preserve a supported-search baseline before expanding exploration.

Hard constraints: eight distinct base cards, user-locked cards, allowed/owned forms, real user levels, tower selection and mode-specific legality. Current research assumes at most two Evolutions, two Heroes/Champions and three combined special slots. Verify current game rules before shipping; version rules rather than baking them permanently into a component. Elixir preferences are configurable soft or explicit user constraints, not proof of deck quality.

Search stages:

1. Canonicalize and deduplicate. Index seed decks by card/form membership and relevant constraints. Retrieve decks compatible with locked cards; when no exact seeds exist, use nearest seeds and constrained repair instead of returning nothing.
2. Generate diverse candidates from multiple archetypes. Rank proposed additions using training-only card co-occurrence, learned embeddings and optionally audited strategic role features. Keep an exploration quota so frequency heuristics do not rule out novel counters.
3. Evaluate complete decks only. For a partial set S and candidate next card c, construct several legal completions of S+c. Allocate comparable completion budgets across c. Score robustly across good completions rather than taking one lucky extreme prediction. Display the suggested completion, not a purported win rate for a four-card deck.
4. Beam search retains multiple distinct strong decks. Apply one-card mutations, then selective two-card mutations when budget remains. Recheck legality after each mutation. Keep locks intact and avoid near-identical final suggestions.
5. Use successive filtering for meta search: cheap proposal ranking, small representative opponent basket, larger basket for survivors, full 100â€“500 opponent basket only for finalists. The shortlist stage must retain some diversity and exploration. Record pruning diagnostics and compare quality against a larger-budget reference search.
6. Batch inference and cache scores by model/rules version, canonical decks, forms, levels and towers. Cache meta rankings additionally by basket/weight version. Stale model predictions must not survive a model update unnoticed.
7. Return best-so-far at a strict deadline with number of candidates evaluated, scope of search, support indicators and distinct alternatives. Never describe this as a proven global maximum.

Complexity planning: B candidates times M opponents means B*M pair predictions. A 1,500-candidate search over 500 decks is 750,000 pairs, not 1,500 calls. Avoid that full Cartesian product on every click. Precompute common-deck meta scores offline and batch finalist rescoring. Measure incremental value of each extra search stage.

Quality gates: compare fixed retrieval, current local mutations and expanded beam search at equal latency budgets. Track top-score improvement, diversity, unsupported-pair frequency, ensemble disagreement if available, and stability across random seeds. A higher predictor score alone is not evidence of a stronger real deck. Validate future match outcomes where supported; prospective playtesting is needed for novel generated decks. Keep supported and experimental results distinguishable.

## 6. Phase C â€” friend histories and counter integration

Prepare additive migrations with RLS and indexes. Suggested logical entities: canonical matches keyed by physical-match hash; player-match associations; normalized deck snapshots including base/form IDs, levels, tower, mode and battle time; per-player deck summaries. Choose shared versus per-user storage only after checking existing RLS and retention policy. Fetch each public player log once per polling cycle even if many users follow that player.

Preserve physical-match identity across reversed API perspectives using the research identity definition. Store rules classification/version and provenance. Retain modified/unknown records only where needed, excluded from standard product summaries. Normal 1v1 must be an allowlisted mode with validated structure, not merely two participants. Keep draft separate from chosen-deck usage: draft history is not evidence of a friend's preferred deck.

The UI exposes the newest 100 RECORDED eligible full matches per tracked subject, not an API-recoverable history. Keep compact per-deck counts, first/last observation, and the top five decks after older full rows are pruned; totals begin when tracking/capture starts, not at the player's lifetime. Repeated polling is required; inactive users can be polled less frequently. Deduplication must make retries harmless. Decide retention independent of existing win/loss aggregates so history pruning cannot erase lifetime scores. The short battlelog API window cannot backfill matches that rolled off before capture.

Compute exact deck usage first; optionally add explicitly labeled archetype grouping later. Separate form/tower differences and retain level distributions. Show the top 2â€“3 decks with counts and shares; account for the unrepresented tail rather than silently describing three decks as the full history. Counter-one uses one opponent; counter-usual uses normalized recent usage weights with a stated coverage percentage.

Acceptance: reversed and repeated logs yield one match; unsupported modes never enter summaries; adding the same friend for multiple users does not multiply external fetches; existing wins/losses and rating behavior remain correct; users cannot read another user's private tracking data.

## 7. Phase D â€” iterative builder and objectives

Create public /deck-builder, /counter-deck and /matchup pages with reusable card selection, form/level/tower controls, locking, exclusions and ownership constraints. Existing local lab is a functional reference, not a production component dependency. Invalidate results when inputs change and cancel superseded requests. Provide usable loading, deadline, insufficient-support and service-unavailable states.

Two explicit objectives:

- Counter a friend: maximize weighted predicted win rate against selected recent decks.
- General deck quality: maximize sum_j w_j p(D,D_j), using recent tier/mode-specific opponent frequencies, with separate bad-matchup resilience and evidence-strength metrics.

Do not call the weighted-meta winner game-theory optimal or unexploitable. A later adversarial loop can discover counters, expand the opponent pool and solve for mixtures within a finite modeled payoff matrix. Its conclusions remain conditional on model quality and candidate coverage.

Start completion with constrained search using the existing predictor. Later train a separate masked-card proposer on training-only complete decks: mask varying subsets, predict missing cards/forms without duplicates, and condition on supported rules. It learns plausible combinations; the matchup model ranks completed decks. Benchmark held-out completion quality AND downstream search efficiency. Do not train the outcome model to interpret absent cards without an explicit missing-card training objective.

## 8. Interpretability and evaluation

User-facing explanations should come from computed comparisons: legal card swaps with complete-deck prediction deltas, breakdown against each opponent deck, historical support and typical weak matchups. Do not treat attention as causal importance or invent tactical explanations/placement advice from battle logs. Attention visualizations may remain on an educational methodology view.

Preserve frozen historical tests. Architecture selection uses validation; calibration uses its held-out partition. Before launch, evaluate fresh chronological data, calibration bins, Brier/log loss, equal-level subsets, league/mode slices and low-support deck pairs. The current model has no skill input; say model-estimated matchup advantage, not demonstrated equal-skill causal win probability. Community data requires mode audit, cross-source deduplication and a documented export before retraining.

Report model freshness and training coverage. Monitor drift after balance changes. Promote bundles only after comparison and keep rollback possible; collection schedules must not auto-promote unchecked models.

## 9. Phase E â€” SEO and rivalry sharing

Server-render explanatory content for public tool pages, give each distinct title/description/canonical, add sitemap entries and internal links. Index useful curated deck pages; avoid indexing combinatorial generated URLs or private histories. Add a methodology page with dataset scope, metrics and limitations. DeckAI already offers overlapping tools; Rival's differentiated flow is rivalry tracking -> friend's habits -> personalized counter -> shareable results.

Implement opt-in /rivalry/[share-id] public snapshots. Persist only fields selected for sharing: display names, record, time window, timestamp and optionally chosen deck. Generate Next.js Open Graph images server-side. Keep snapshots stable for social caches, offer revocation, and never expose private auth metadata. Share with native browser sharing when available and copy-link fallback; test target iOS/social previews. Add noindex for personal rivalry snapshots by default; publicly retrievable for previews does not mean discoverable in search.

Acceptance: preview works without login, contains only the explicit snapshot, remains consistent with its dated record, and revocation prevents future retrieval (already cached social copies cannot be recalled).

## 10. Rollout, testing and concrete first tasks

Implement in small reviewable phases with feature flags. First deliver bundle export and measured CPU benchmarks; then production prediction service and matchup page; then histories and supported counters; then sharing and broader completion search. Masked proposer and game-theory experiments are later work, not launch dependencies.

Use existing app Jest tests plus focused preprocessing/parity, search legality, deduplication, RLS/integration and API contract tests. Run lint/build and relevant suites. Test browser flows on mobile widths. Benchmark on target hosting, not just a developer PC. Record run parameters and model hashes with results.

Before enabling new scheduled work, fix the observed sync cron's acceptance of spoofable cron headers/user-agent as authorization and remove all-header/secret-prefix logging. Require the configured secret. This is a concrete issue in app/api/cron/sync-all-users/route.ts, not a hypothetical concern.

Deployment checklist: service authentication, quota/time budget, no runtime training data, readiness probe, pinned model bundle, rollback, Supabase migration/RLS review, cloud collection schedule distinct from local research automation, cost monitoring and limited beta flag. Prepare configuration without copying root .env into an image or git. Do not claim launch until deployed endpoints are verified.

Next agent should begin by reading this plan, checking git status, reviewing the copied research guide's authorization override, and exporting the two-layer bundle from the original ignored artifacts. Produce BENCHMARK_RESULTS.md with actual measurements before deciding the default candidate/opponent budgets. No additional brainstorming or user permission is needed for these local implementation steps.

## References checked during planning

- https://vercel.com/docs/functions/runtimes/python â€” Python support and package constraints.
- https://railway.com/pricing â€” resource-based usage and Hobby included credit; recheck at deployment.
- https://nextjs.org/docs/app/getting-started/metadata-and-og-images â€” metadata and dynamic share images.
- https://deckai.app/guide â€” competitor features; claims belong to that product, not validation of our model.
