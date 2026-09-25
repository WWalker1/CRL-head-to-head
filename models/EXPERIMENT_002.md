# Experiment 002: expanded Ranked data

Frozen source: 501,455 unique matches. Usable export: 486,362; prior test IDs are excluded. Grand/Royal Champion labels use decisive crowns because rating/trophy fields can be omitted; UC requires corroborating trophy signs. Missing lower-league rating context is zero, and the attention model ignores rating.

## Actual held-out results

| Model | Accuracy | Log loss | AUC |
|---|---:|---:|---:|
| Attention | 57.77% | 0.6734 | 0.6111 |
| Card/form linear | 52.42% | 0.6909 | 0.5353 |
| Rating only | 50.71% | 0.6931 | 0.5089 |
| Constant 50/50 | 50.02% | 0.6931 | 0.5000 |

| Partition | Matches |
|---|---:|
| train | 389,089 |
| validation | 24,315 |
| calibration | 24,320 |
| test | 48,638 |

Same architecture as experiment001: 124,865 parameters, 64-dimensional joint card/form embeddings, two shared self-attention layers, four-head cross-attention, antisymmetric scoring. Seed42, AdamW0.0006, batch512, 14-day recency half-life. Selected epoch 6 from 9 executed epochs (maximum30, validation early stopping). Temperature 1.2059 fitted separately on calibration. Test outcomes were not used for those choices.

## Like-for-like future comparison

Both checkpoints are scored on the same new test games, excluding every old split ID and requiring timestamps later than the entire old test window. This controls the evaluated matches, but the new experiment changes training population and training duration; it is not a pure data-size ablation.

| Cohort | Games | Old accuracy | New accuracy | Old log loss | New log loss |
|---|---:|---:|---:|---:|---:|
| all_supported_ranked | 48,638 | 55.40% | 57.77% | 0.6834 | 0.6734 |
| ultimate_champion | 39,483 | 55.54% | 57.78% | 0.6830 | 0.6730 |
| league_5 | 520 | 52.50% | 54.04% | 0.6976 | 0.6874 |
| league_6 | 8,635 | 54.94% | 57.96% | 0.6843 | 0.6745 |

See the run `comparison.json` for paired bootstrap differences and approximate player-grouped intervals. Shared players and short chronology remain limitations. The old model was trained only on UC; the UC comparison is the central comparison.

## Confidence and coverage

Training contains 72,614 distinct card/form decks. Top ten deck share: 10.42%. Unseen test deck share: 15.28% (ignoring levels and towers).

| Favorite probability | Games | Observed favorite wins |
|---|---:|---:|
| 50%–55% | 17,979 | 52.18% |
| 55%–60% | 14,408 | 56.58% |
| 60%–65% | 9,101 | 61.67% |
| 65%–70% | 4,871 | 67.77% |
| 70%–80% | 2,206 | 72.30% |
| 80%–100% | 73 | 76.71% |

These post-hoc bins describe natural held-out matches. They do not validate probabilities for artificially extreme decks or search-selected counter-decks. More extreme outputs are not inherently more accurate. No individual user matchup was used for tuning.

## Counter-deck creator

The local lab offers observed training seeds plus a bounded diverse beam search over legal one-card changes. It evaluates up to1,536 candidates, stays within two changes of a frequent training deck, supports locked cards, fixed candidate levels and elixir constraints, and returns up to three distinct choices. It enforces eight distinct base cards, at most two Evolutions, at most two Heroes/Champions and at most three special slots total. Tower choice remains user-controlled. A fixed penalty for changes favors supported candidates; it is not a statistical confidence bound. Search estimates are not measured real win rates or proof of a global optimum.

## Daily operation

The Codex local scheduled task runs at03:00 local time, targeting200,000 new unique games within one hour. Python performs collection and deduplication; gpt-5.6-luna invokes it and checks the audit report. Computer/app/network and available agent usage are required. See DAILY_INGESTION.md. Daily ingestion does not automatically promote models.

## Next model experiment

Use a fresh future holdout before selecting further changes. Compare explicit cross-deck card-pair interactions and within-deck synergies against attention; then consider card-role features such as target type, range, damage type and win-condition role with verified, versioned sources. Evaluate probability calibration and uncommon-deck coverage, not merely aggregate accuracy. Mechanically verified features should not be replaced by hand-labelled win probabilities.

Run: `models\data\runs\20260921T223438Z`
Dataset: `models\data\training\20260921T223412Z-a6dffa9e`
