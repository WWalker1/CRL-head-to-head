# Rival Royale: model-powered product implementation and agent handoff

Plan date: 2026-09-23. Updated: 2026-09-25. Status: friend deck and counter flow implemented locally; Supabase integration and Railway deployment pending. The iterative deck builder is tabled at the user's request. Its beta route remains in the code but is removed from primary navigation and the sitemap. Read DEPLOYMENT_SETUP.md and IMPLEMENTATION_REPORT.md for current status. The sections below retain the full design plan, not a claim that every planned feature is complete.

## 1. Authorization, purpose, and workspace

September 25 follow-up: migration 009 adds the account owner's persistent normalized history and versioned matchup predictions. Manual and existing daily sync capture eligible player/friend logs when MATCH_HISTORY_ENABLED=1. Recent most-played decks and model-relative skill use a latest-100 window while archival rows remain stored. A provisional skill score compares actual decisive Ranked wins to supported, post-training-cutoff deck expectations; tough-matchup record uses p < 0.40. See DEPLOYMENT_SETUP.md for formula, exclusions, and setup. No live migration has been applied.

The user approved moving the experimental matchup predictor into a product beta: friend deck analysis, counter decks, iterative deck building, and shareable rivalry cards. They explicitly requested an isolated worktree and a detailed plan before implementation so another agent can continue. Their main concern is searching the enormous deck space quickly. Do not attempt exhaustive enumeration or promise a globally optimal counter.

Worktree: `C:\Users\22wes\.codex\worktrees\rival-model-product\head-to-head-royale`

Branch: `codex/rival-model-product`.

Original workspace: `C:\Users\22wes\Programming Projects\head-to-head-royale`.

Production application changes are now authorized in this worktree. Earlier language in models/AGENTS.md prohibiting production code changes describes the research phase; the present authorization supersedes it for this worktree. Implement and test locally before deploying. Do not assume credentials authorize unrelated database changes. Prepare migrations and deployment artifacts for review before any live rollout. No live deployment or database migration has occurred in this task.

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

The UI promises the last 100 RECORDED eligible matches, not an API-recoverable history. Track first/last observation, last sync, coverage gaps and count. Repeated polling is required; inactive users can be polled less frequently. Deduplication must make retries harmless. Decide retention independent of existing win/loss aggregates so history pruning cannot erase lifetime scores.

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
