Community fan-out is available through `supabase_seeds.py` and `community_harvest.py`. [Four-layer results](EXPERIMENT_003.md):52.26%, so the two-layer model remains selected.

# Current experiment results

Expanded two-layer attention: **57.77% test accuracy**, log loss0.6734, AUC0.6111 on48638 held-out games. Original model on those same games:55.40%. See [expanded report](EXPERIMENT_002.md), [daily ingestion](DAILY_INGESTION.md), and [agent guide](AGENTS.md). The four-layer depth experiment is separate and does not automatically replace the lab checkpoint.

# Completed attention experiment

150,419 unique UC games collected; 150,395 usable. Harvesting stopped at the target. The trained model scored 55.13% on 15,040 held-out games. See [the experiment report](EXPERIMENT_REPORT.md) for metrics, methodology and limitations. Run `./models/start_lab.ps1` from the repository root to open the interactive lab at http://127.0.0.1:8766. The notes below preserve earlier collection stages.

# Rival Royale modeling experiment

This directory is independent of the Next.js app, Supabase database, and deployment. No production integration or model training is implemented yet. Start with data verification, then baselines, then attention.

## Status

**Latest workflow:** `harvest.py` replaces the sequential collector for the current run, with 12 workers sharing a 12-request/sec cap, persistent per-player yield measurements, and retries for connection resets. The current concrete target is 150,000 unique UC matches. It automatically creates a validated chronological tensor export after crossing 100,000 and again on completion. See [TRAINING_DATA.md](TRAINING_DATA.md) for the exact tensors, normalization, exclusions, leakage controls, and runnable attention ingestion check. The production app remains untouched.

Run `models/.venv/Scripts/python.exe models/yield_report.py` for current observed yield and explicit first-pass scenarios. The pilot at 4,487 logs averaged 30.887 returned games and 15.453 UC observations per log. Applying 50%–80% unique retention to 25,000 players projects roughly 193k–309k unique games if eligibility holds; these are scenario assumptions, not confidence bounds or promises. Actual per-player overlap rises as the pool is exhausted. `data/training/latest.json` points to the latest fully validated export. Raw data is still in `data/ultimate-champion/battles.sqlite3`.

### Current collection: Ultimate Champion only

**Latest discovery expansion:** The collector now draws candidates from country Ranked leaderboards and participants of accepted UC matches, in addition to the global top 1,000. The former top-1,000-only behavior described below is historical. Live tests of Brazil, Japan and the US added 2,767 distinct IDs outside the global list. `/locations` exposed 254 country entries, and `discovery.py` queries `/locations/{id}/pathoflegend/players?limit=1000` for each, preserving candidate source and regional rank separately from global rank. Not every returned player is assumed to be UC: the battle-level filter remains unchanged.

`uc_frontier` persists fetched timestamps and deduplicated IDs. `player_sources` records regional/global membership and discovery from UC matches. New candidates are fetched first; already fetched players become eligible for a revisit after 30 minutes, subject to capacity. Accepted matches contribute both participants back to the pool. Other modes never expand it. `discovery_provenance` records the source evidence for each newly stored match; absent global rank stays null. Older matches retain their original top-1,000 provenance. This expands coverage beyond the top 1,000 while still storing only the verified UC mode/league. The regional discovery sweep is resumable by rerunning (duplicates do not erase fetch progress); it is not automatically repeated on a schedule.

Run `.venv/Scripts/python.exe models/discovery.py` for a regional sweep and `.venv/Scripts/python.exe models/collect_leaderboard.py` for continuous collection. They can run together with SQLite transactions. `discovery.json` reports completed countries and candidate counts; `status.json` includes candidate pool and unfetched counts. Country ranking entries are candidates, not a count of verified current UC players. The shared dataset STOP file stops both processes.

The broad opponent-discovery crawl is **stopped**. Its 8,892 unique raw battles remain in `data/battles.sqlite3` and are not mixed into the new dataset.

`collect_leaderboard.py` now uses the live-verified official endpoint `/v1/locations/global/pathoflegend/players?limit=1000`. It refreshes the global Ranked top 1,000 every 30 minutes and polls those players only. No opponents are added to the player pool. The leaderboard supplied 1,000 entries without a pagination cursor; this is intentionally a top-1,000 sample, not every Ultimate Champion player.

Each saved game must be an eight-card 1v1 with `type=pathOfLegend`, `leagueNumber=7`, `gameMode.id=72000464`, `deckSelection=collection`, no event modifiers, and a battle timestamp within the last 30 days. Hosted/tournament games are excluded. League 7 was checked against the current #1 player's current-season profile and Ranked battle logs; it is not the old league-10 convention. Each refresh rechecks the leader's current league and stops if that assumption changes. Both players need not be in the current top 1,000: the source player is, and the match must have been in Ultimate Champion. Source rank is recorded at collection time, not asserted to be their historical rank when the game occurred.

Filtered battles, leaderboard snapshots, source-rank provenance, and status live in **`models/data/ultimate-champion/`**. Rejected battle payloads are not persisted there. The API returns whole logs, so non-UC games are received and immediately discarded. Eight tests cover collection basics and strict exclusions. Narrowing to top players improves relevance but greatly reduces yield; **three million unique games is now a long-term target, not a two-day estimate**. Repeat polls deduplicate games rather than inflate counts. The 30-minute cadence can miss games when very active players overflow their recent log.

```powershell
.venv/Scripts/python.exe models/collect_leaderboard.py
Get-Content models/data/ultimate-champion/status.json
# Graceful stop:
New-Item models/data/ultimate-champion/STOP -ItemType File
```

The collector is bounded to 48 hours/500,000 requests per launch and 2 requests/second. Keep the machine awake. A lock file prevents concurrent copies. After a crash, verify the recorded process has exited before removing a stale lock. To resume, remove only this dataset's STOP file and rerun the command. Keep the broad dataset's STOP file in place.

### Earlier broad pilot (historical)

Updated September 20, 2026 (Chicago): the saved root `.env` contains lowercase `crl_api_key`; authentication to the official API succeeded. The collector now accepts both lowercase and uppercase spellings. The pilot collected **1,439 unique battles in 47.6 seconds**, with 1,004 structural candidates and 609 preliminary regular ladder/ranked matches. Five local tests pass. The app uses a different variable (`CLASH_ROYALE_API_KEY`) and the RoyaleAPI proxy; its configuration was not changed. Never copy secrets into documentation or source control.

A hidden local background process has been launched toward **3,000,000 structural candidates**, with 2 requests/second maximum, 500,000-request and 48-hour bounds. This is not a promise of three million finalized training examples. See `data/collector.pid`, `data/collection.log`, `data/collection-errors.log`, and `data/status.json`. Keep the computer awake and connected. No hosted scheduler or automatic restart after reboot is installed.

Check status from the repository root with `Get-Content models/data/status.json` and `Get-Content models/data/collection-errors.log`. To stop gracefully, create the stop file: `New-Item models/data/STOP -ItemType File`. To resume, remove that specific stop file and rerun the bulk command after verifying the prior PID has exited. Run only one collector per database.

The existing app's battle types omit card details, and its documented retention is 25 recent battles. They are not an adequate training schema. The developer website embeds `/api-docs/index.html`, whose Swagger URL is supplied through a logged-in cookie. We inspected that page and verified the endpoints below through authenticated requests rather than claiming to have fetched its private Swagger specification.

### Endpoints verified live

| Method | Endpoint | Observed response |
|---|---|---|
| GET | `https://api.clashroyale.com/v1/cards` | Object with `items` card catalog |
| GET | `https://api.clashroyale.com/v1/players/%23PLAYER_TAG/battlelog` | Array of battle objects |

The first player returned **27** battles; do not hard-code a 25-battle response limit. No historical-pagination mechanism was verified. The public `rival-rail.com` address could not be retrieved by the web tool; the local app source confirms its existing proxy URLs.

Run `.venv/Scripts/python.exe models/audit.py` for a bounded read-only audit (up to 10,000 rows). The initial report is `data/audit.json`. Observed fields include card `id`, `level`, `maxLevel`, `rarity`, `elixirCost`, `evolutionLevel`, and player `supportCards` for tower troops. The observed evolution values include 1, 2, and 3: preserve them without prematurely assuming they mean a simple evolution count. Special-mode `modifiers` also occur. Hero/form semantics remain a normalization research task. `startingTrophies` is not present for every mode. Post-match tower HP and elixir leaked must not become predictive inputs.

The initial sample spans August 5 through September 21 UTC: recent logs can contain older games from inactive players. Battle time, not collection time, determines recency weights. Average compressed raw payload was about 1,837 bytes/game; allow substantial overhead for SQLite pages, indexes and player discovery. The broad crawl is raw data acquisition; training requires the mode and outcome validation gates below.

## Run the initial audit

Save `crl_api_key=your-key` (uppercase also accepted) in the root `.env`. From the repository root in PowerShell:

```powershell
.venv/Scripts/python.exe models/collect.py --seed '#8PU82CPP' --target 1000 --max-requests 100 --max-hours 0.25
```

This seed is an existing public example in the repository, not a representative sample. Add several `--seed` arguments covering different skill tiers and regions. If the key is configured for the proxy, add `--endpoint proxy`; the official proxy instructions require allowing IP `45.79.218.79`. Direct API access requires the calling machine's outbound IP to be allowed. The collector never automatically forwards a key to a different endpoint.

Outputs under ignored `models/data/`:

- `sample-battle.json`: first complete response item, for field verification.
- `cards-<timestamp>.json`: dated card-catalog response.
- `battles.sqlite3`: compressed raw battles, persistent player frontier, and run summaries.
- `latest-run.json`: measured counts, explicitly including whether the target was reached.

The collector follows opponents to discover more players, requests each player once, deduplicates both perspectives, checkpoints each log, paces requests, retries throttling/server errors, stops on authorization errors, and stops with less than 2 GiB free disk. Re-running resumes unfetched players. Raw player names/tags remain in the ignored local dataset; do not publish it without a separate data policy.

**Prototype limitations:** synchronous requests; one process per database; no continuous player polling; discovery is biased toward the seed graph; request/time limits are checked between logs (retries can exceed the request budget by up to five attempts); special modes are retained and structural candidates are NOT approved training examples. Do not run a multi-million target until the audit below passes.

## Live schema and collection gates

1. Confirm `/cards` response shape and `/players/{tag}/battlelog` array shape. Measure actual log lengths across players; do not assume pagination or a historical export exists. A last-100 view requires prospective polling and retention if only a short recent window is returned. Show "N recorded games" and coverage gaps honestly.
2. Inventory battle type, game-mode ID/name, deck selection, timestamps, team/opponent counts, and all player/card fields. Check normal ladder, ranked, friendly, draft, event, and 2v2 examples. Create an explicit reviewed allowlist for comparable constructed 1v1 modes; unknown modes go to quarantine.
3. Verify card IDs, levels and their rarity-dependent encoding, elixir costs, active Evolution/Hero forms, tower troops and tower levels, and special slot semantics. Preserve source order and unknown fields until verified. If forms/slots are missing, document the ambiguity and restrict the task rather than fabricate fields.
4. Normalize UTC battle times. Canonicalize sides by player tag, and store outcome relative to canonical A. Store win/loss/draw explicitly; check crown ties and tiebreak semantics using responses before assigning labels. Never silently convert missing outcomes into losses.
5. Deduplicate using time + sorted participant tags + mode + battle type; this is a synthetic key, not an API-issued ID. Check collisions and conflicting payloads during the audit. Current collector keeps the first payload. Reversed views must land in the same data split.
6. Record freshness, malformed rows, duplicate ratio, eligible fraction, errors/429s, unique players, tier/mode/region coverage, cards/forms coverage, and new unique usable games per request. Missing region is unknown, not inferred.
7. Audit at 1k, 10k and 100k. Raw collection can proceed while semantics are investigated; do not train until the relevant gates pass. Estimate compressed bytes/game and sustained yield, and report the eventual accepted-training count separately from the 3-million structural target.

Bulk command (a run with additional public seeds has been launched):

```powershell
.venv/Scripts/python.exe models/collect.py --seed '#8PU82CPP' --target 3000000 --max-requests 500000 --max-hours 48 --rps 2
```

This stops at the first limit; it does not promise 3 million samples. At 25 returned games/log, 2 requests/sec, 50% new unique and 70% eligible, estimated yield is 17.5 usable games/sec, or about 48 hours for 3 million. These are **planning assumptions**, not measurements or API guarantees. Sequential latency may make actual rate lower. At 2-10 KiB compressed/game, 3 million raw games take roughly 6-30 GB before indexes, metadata, and training exports. Extrapolate from the pilot and reserve headroom. Historical rate-limit notes in this repo are not a current service quota.

For sustained collection, add a persistent scheduler on an always-on machine, bounded workers, periodic revisits, log rotation, daily Parquet partitions, and health monitoring. Start with local SQLite; move analytical reads to Parquet/DuckDB after pilot validation. Do not use the app's serverless cron or production database. Weekly 500k fresh games requires about 71,429 unique usable games/day. Broaden seeds by skill/region/clan and cap per-player contributions; opponent discovery alone can yield millions of correlated, unrepresentative games.

## What the predictor means

Target: probability deck A beats deck B in a specified mode, patch/time, skill range, and level configuration. The API gives observational outcomes, not controlled experiments. Better players may select certain decks; matching and levels confound win rates. Millions of matches do not eliminate that bias or guarantee coverage of rare matchups.

Maintain two evaluations: (1) equal-level or tightly matched samples for matchup strength, (2) actual-level prediction with explicit context. Only use verified pre-match skill proxies; current profile statistics are not historical pre-match measurements. Compare with/without skill and level controls. Do not use crowns, trophy changes, remaining tower HP, elixir leaked, or any post-match statistic as input. Player tags support deduplication, sampling and held-out-player audits, not primary model features.

For v1, train on decisive matches and label predictions clearly as conditional on a decisive match. If draws are material, use a three-outcome head instead of pretending draws are losses or treating a fractional target as a win probability.

## Learning sequence and architecture

1. **Baselines:** constant 50%, smoothed deck-vs-deck tables, regularized logistic regression on card-count differences plus selected within-deck/cross-deck interactions, then a small feedforward network. Compare against a context-only predictor to expose skill/level shortcuts.
2. **Attention:** each card becomes a learned vector (embedding), combined with verified form, level, elixir, and card metadata. Shared self-attention lets each card consult its seven teammates, learning synergy. Cross-attention lets each card consult the opponent's cards, learning counters. Pool the resulting vectors into one representation per deck.
3. Start small: embedding width 64, 2 shared attention blocks, 4 heads, dropout, and a small scoring MLP. Treat these as initial hyperparameters, not conclusions. Eight-card sets need no large language model. Preserve actual form/slot roles in token features, but do not add arbitrary positional embeddings for interchangeable card ordering.
4. For decisive games use `logit(A,B,c) = g(A,B,c) - g(B,A,swap(c))` and sigmoid. This makes exchanging both decks AND side-specific context complement the prediction. Test permutation invariance, swap symmetry, mirror matchups, missing metadata, and unseen cards.
5. Train using temporally weighted binary cross entropy. Compare the attention model to baselines on untouched future games before using it for recommendations. Calibrate probabilities on a separate chronological calibration window.

Embeddings learn properties from outcomes without simulating every card's stats. Metadata can help cold start, but a new card with no outcomes still has uncertain matchups. Attention weights are associations, not proof that a particular interaction caused a win.

## Time, patches, and evaluation

Keep all raw data for reproducibility; choose training retention separately. Weekly retraining can combine up to 500k new eligible games with sampled older games. Do not count duplicates or replayed old games toward the fresh quota.

Use `weight = 2 ** (-age_days / half_life_days)` with age measured at the training cutoff. Compare 7/14/28-day half-lives and 30/60/90-day windows using rolling backtests. Track effective sample size `(sum w)^2 / sum(w^2)`, not just row count. Avoid accidentally double-decaying data through both sampling and loss weights.

Maintain a manually verified patch calendar with source URL and effective timestamp; give uncertain times an uncertainty flag. Use patch/time features, reset or downweight pre-change data for affected cards, and trigger evaluation after significant balance changes. Do not assign every game the collection date's patch. Year-old games should not dominate new-card or changed-rule predictions. Weekly retraining is a starting cadence; patch-triggered recalibration may be needed sooner.

Split chronologically (for example first 10 days training, next 2 validation/calibration, final 2 test in a two-week pilot), keeping each physical match wholly in one split. Refit preprocessing on training only. Run rolling-origin tests over several patches once enough history exists, plus held-out players/deck archetypes and level/tier/mode slices. Two weeks alone cannot establish robustness across annual meta shifts.

Report log loss, Brier score, reliability diagrams, calibration error, AUC and accuracy, with player/day-clustered confidence intervals. Compare to all baselines and report low-support slices separately. Do not promise a target accuracy before measuring. A 55% calibrated counter can be useful; a spurious 95% prediction is dangerous to recommendation quality.

## Top decks and counters

Keep a rolling 100 recorded eligible games per tracked player with timestamps and coverage. Group exact decks by IDs plus active forms and tower troops; optionally cluster archetypes separately with transparent similarity rules. Rank top 1-3 by recent usage, showing counts, time range and uncertainty. A card-set match is not sufficient if forms differ.

For candidate deck D, rank by `sum_j usage_weight_j * P(D beats opponent_deck_j | context)`. Smooth weights when history is short; explain how much usage the top three cover, and optionally use the full observed mixture. Score legal, supported candidates constrained to the user's owned cards/levels/forms. Show estimated probability, support and uncertainty, not a guaranteed best deck. Avoid recommending low-support adversarial combinations merely because the model gives them a high score.

## Iterative deck building (1 through 8 cards)

Start by retrieving successful complete decks containing the user's chosen cards. For each legal next card, propose supported completions and score those **complete** decks with the matchup predictor. Aggregate over completions against a current-meta opponent mixture or the friend's deck mixture. Use a beam search if retrieval coverage is insufficient; preserve the locked cards and validate legality at every step. Never pass a one-card deck into a model trained only on eight-card decks and interpret its output as a real win probability.

An optional second model learns deck completion by masking 1-7 cards from historical decks and predicting the missing set without duplicates. This learns plausible decks, not necessarily winning decks; use the matchup model for reranking. Share the encoder later if helpful, but keep objectives distinct for learning and debugging.

Evaluate held-out completion recall@k, legal-deck rate, diversity, support, matchup-score calibration, and expert inspection. Offline win-rate estimates are not proof that suggested decks improve a person's performance. Eventual prospective testing is a separate product phase.

## Two-week experiment

| Phase | Deliverable | Exit condition |
|---|---|---|
| Days 1-2 | Authenticated schema audit, 10k-100k pilot, data dictionary | Verified forms/outcomes/modes, measured yield and cost |
| Days 3-5 | Sustained collection, temporal exports, baselines | Stable deduplication and no post-match leakage |
| Days 6-8 | Small attention model and ablations | Future-window comparison and symmetry tests |
| Days 9-11 | Recency weighting, calibration, patch analysis | Reproducible metrics and uncertainty slices |
| Days 12-14 | Offline top-deck/counter/completion demo | Legal supported outputs and honest limitations |

CPU is sufficient for collection and initial baselines. Benchmark the small attention model on available hardware before renting a GPU or committing to a weekly runtime budget. Model artifacts should version data cutoff, card vocabulary, schema, patch calendar, split manifest, hyperparameters and calibration alongside weights.

## Sources reviewed

- [Official API portal](https://developer.clashroyale.com/): authenticated response audit still needed.
- [RoyaleAPI proxy configuration](https://docs.royaleapi.com/proxy.html): endpoint and IP allowlisting.
- [Supercell Cards & Decks](https://support.supercell.com/clash-royale/en/articles/cards-and-decks-6.html): card forms and special slots.
- [Mid-March 2026 update](https://supercell.com/en/games/clashroyale/blog/news/mid-march-update/): deck slot changes; verify rules per mode and date.
- [September 2026 balance changes](https://supercell.com/en/games/clashroyale/blog/release-notes/september-balance-changes-2026/): concrete example of intra-month changes.
- [Set Transformer paper](https://arxiv.org/abs/1810.00825): attention over unordered sets; inspiration rather than an implementation requirement.
