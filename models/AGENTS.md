# Worktree authorization update — 2026-09-23

The user now authorizes production feature implementation in this isolated worktree. Read ../IMPLEMENTATION_PLAN.md first. Its scope supersedes the earlier research-only restriction below. Preserve the original workspace and collection databases. Start with portable inference and actual CPU/search benchmarks; no deployment has occurred.

# Rival Research: agent handoff

This directory is an experimental ML project for Clash Royale matchup prediction and legal counter-deck generation. The user is learning attention models and wants readable implementation, honest evaluation and an interactive local lab. Production Rival app code must remain untouched. The user subsequently authorized read-only Supabase player-tag extraction for community collection. Do not modify Supabase or fetch unrelated account data.

## Scope and authorization

The user authorized API collection to 500,000 unique standard Ranked games, opponent-based breadth-first discovery, formatting, model training/evaluation, and a constrained counter-deck creator. The user explicitly requested cheaper subagents for collection/preparation while the parent handles complex modeling/search. Use gpt-5.6-luna for bounded delegated data tasks when available. Avoid redundant agents or simultaneous collectors.

## Credentials and environment

- Repository root `.env` contains lowercase `crl_api_key`; use the existing credential loader. Never print or copy credentials into logs, code, browser or reports.
- API base: https://api.clashroyale.com/v1. Existing client rate-limits and retries; respect these controls.
- Isolated Python: `models/.venv/Scripts/python.exe`; NumPy and CPU PyTorch installed. No GPU assumed.
- All data, checkpoints and virtual environment are ignored by this directory's `.gitignore`.

## Data integrity

- `collect.py`: client, normalized physical-match SHA-256 identity and SQLite storage. Identity includes timestamp, sorted participant tags, mode and type. Reversed API views must deduplicate; distinct games with equal decks must remain.
- `discovery.py`, `harvest.py`: persistent player frontier, regional/global seeds and opponent fan-out. Check lock/PID before launching. Do not run two collectors on the same database.
- Historical database path `data/ultimate-champion/battles.sqlite3` initially held UC only. The 500k experiment expands to Grand/Royal/Ultimate Champion (leagues 5/6/7); never infer cohort from this folder name. Preserve cohort metadata and report actual distribution.
- Keep normal Ranked 1v1 with eight unique cards each, verified modes, no modifiers, correct source participant and bounded age. `mode_policy.py` classifies modes conservatively. Draft is separate research; Chaos/Touchdown/modified modes must not enter this training set.
- Freeze immutable exports before training. Training-only vocabularies; chronological split with timestamp ties together; distinct validation/calibration/test. Do not recycle the inspected first experiment's test IDs into new training or tuning.
- No outcome-derived fields or player identifiers in model inputs. Hashed player IDs remain audit-only pseudonyms. Do not publish raw player data.

## Model and evaluation

`attention_data.py`: shared joint card/form embeddings, numeric features, tower token, two four-head self-attention layers, cross-attention and antisymmetric score. Deck order is irrelevant; swapping opponents complements probability. Current model ignores rating; rating baseline is separate. Forms base/Evolution/Hero have separate canonical keys; champions already have distinct base IDs. Code 3 is ambiguous and not offered. Card levels require rarity offsets.

`prepare_data.py`, `verify_export.py`, `train.py`: normalized arrays, artifact validation, baselines, temporal decay, validation selection and held-out calibration/evaluation. Preserve old runs and manifests. A larger test set improves measurement, not training; enlarge the training set too. Compare old and new models on the same new UC holdout when claiming improvement. Keep league-specific results.

Experiment 001: 150,419 raw unique UC games, 150,395 decisive; train120316/validation7519/calibration7520/test15040. Model124865 parameters, selectedepoch9, testaccuracy55.13%, logloss0.6842,AUC0.5748. See `EXPERIMENT_REPORT.md`. Old export `data/training/20260921T044709Z-653d169c`, old run `data/runs/20260921T163430Z`.

## Counter-deck search

Winner prediction and counter-deck generation are distinct objectives. Search cannot establish causal advantage or promise 80% real wins. Generated candidates can exploit model errors. Prefer observed training decks as seeds, constrained local mutations, limited budgets, frequency/support diagnostics and diverse results; distinguish model score from measured performance.

Hard constraints: eight distinct base cards; at most two Evolutions; at most two Heroes/Champions combined; at most three special slots total. Towers are separate. Preserve user-locked cards, owned-card restrictions when supplied and chosen levels. Never search by boosting candidate levels above the user's setting. Avoid exhaustive deck enumeration.

## Local UI

`lab_server.py` serves loopback127.0.0.1:8766 using a frozen saved checkpoint. `lab/` provides deck editor, actual attention heatmaps/token graph and metrics. `start_lab.ps1` launches it. No production deployment. The UI must invalidate predictions when decks change. Label predictions as model estimates, not observed win rates. Attention is information mixing, not causal feature importance.

## Verification and handoff

Run `models/.venv/Scripts/python.exe -m unittest discover -s models -p 'test_*.py'`. Verify tensor preprocessing matches training, legal search output, locked cards and swapped-side invariance. Use browser controls for UI checks; do not bypass UI with browser automation libraries. Report actual collector status, row counts, artifacts, model metrics and remaining limitations. Keep this guide current after material changes.

## Expanded experiment and scheduling

Collection reached501455 games (371827UC,116968Royal,12660Grand). Frozen expanded export: `data/training/20260921T223412Z-a6dffa9e`,486362 usable after excluding15040 old test IDs and53 ties. Train389089, combined validation/calibration48635, test48638. Run `data/runs/20260921T223438Z` is the corresponding experiment; read its metrics file to establish completion. Do not substitute the earlier `20260921T223049Z-a6dffa9e` export: it unintentionally excluded lower leagues and is not the expanded experiment.

`daily_ingest.py` is the idempotent research wrapper. Codex local scheduled task `rival-daily-ranked-ingestion` is paused as of October 6, 2026; the research archive also has a `STOP` file. Do not restart this high-volume collector without a new request. The separate Vercel nightly user sync remains enabled. See DAILY_INGESTION.md. User explicitly declined supplying specific test decks; do not request them again or tune to a few subjective examples. Judge generalization on broad held-out data.

## Community seeds and depth results

Supabase management token is lowercase `supabase_api_key` in the root .env. Never print it. `supabase_seeds.py` discovers the uniquely named Clash-Royale project and uses the management read-only SQL endpoint to extract only distinct player tags from public.user_ratings and public.tracked_friends. Latest extraction:1999 distinct tags. Project API keys use the paginated REST path instead. Output `data/community/seeds.json` stays local.

`community_harvest.py` archives all available recent battle logs in `data/community/battles.sqlite3`, fans out to opponents through depth3, has a200000-match/one-hour bound, persists its frontier and counts overlap with the primary602819-match archive. Do not add archive counts without subtracting cross-source overlap. Unknown, modified and non-1v1 modes remain outside the trained Ranked dataset until vetted.

Four-layer run `data/runs/20260923T004801Z` completed:52.26% test accuracy versus57.77% for the expanded two-layer model on the same48638 rows. Validation selected two layers; latest.json still points to the two-layer run. See EXPERIMENT_003.md. Do not claim that adding layers improved the model.
