# Attention-ready match dataset

## Commands

Use the isolated `models/.venv` runtime, not the application's environment. Tested with Python 3.13, NumPy 2.5.3, and PyTorch 2.14.0+cpu. Install NumPy from PyPI and CPU PyTorch from `https://download.pytorch.org/whl/cpu` if recreating it. No GPU is necessary for preparation and ingestion checks.

```powershell
models/.venv/Scripts/python.exe models/harvest.py --target 500000 --leagues 5,6,7
models/.venv/Scripts/python.exe models/yield_report.py
models/.venv/Scripts/python.exe models/prepare_data.py
models/.venv/Scripts/python.exe models/verify_export.py
models/.venv/Scripts/python.exe models/attention_data.py
models/.venv/Scripts/python.exe -m unittest discover -s models -p 'test_*.py'
```

Run only one collector at a time. The existing `collector.lock` and dataset `STOP` file apply to `harvest.py` too. Default limits: 12 concurrent workers, **shared** 12 request/sec maximum, 12 hours, and 200,000 requests; retries obey the same limiter. Limits are checked between batches of at most 120 logs, so a batch can overshoot them. Authentication errors stop immediately. Connection resets and incomplete responses are retried. Repeated log failures stop with a checkpoint. The raw dataset is retained across restarts. Discovery continues from accepted normal Ranked games in the requested leagues, and per-fetch yield is stored in `fetch_metrics`.

Collection and export are separate steps; the collector no longer launches automatic exports. The usable count is smaller when outcome/feature validation rejects rows. The original 150,000-game Ultimate Champion pilot remains frozen. For a larger mixed cohort, point the exporter at the collector snapshot and explicitly select the normal Ranked leagues:

```powershell
models/.venv/Scripts/python.exe models/prepare_data.py `
  --database models/data/ultimate-champion/battles.sqlite3 `
  --allowed-leagues 5,6,7 `
  --exclude-match-ids models/data/training/20260921T044709Z-653d169c/test.npz
```

The exclusion preserves the inspected pilot test matches when the same database is reused. The new export is written to a dated immutable directory and carries `league_number` per row for separate Grand/Royal/Ultimate metrics. Never change the old directory in place. Use `--include-older-games` only when the collection policy intentionally includes historical records; otherwise the exporter applies the same 30-day eligibility window as the collector.

## Files and format

Exports are immutable dated directories under ignored `models/data/training/`. `latest.json` points to the most recent fully validated export. Each contains `train.npz`, `validation.npz`, `test.npz`, `vocabulary.json`, `manifest.json`, and `validation.json`. The attention smoke test adds `attention-smoke.json`. Files use NumPy arrays with no pickled objects. Raw names, tags, crowns, trophy changes and post-match tower HP do not appear as model features.

Let N be the number of matches in a split. Sides are ordered deterministically by source player tag before tags are omitted. Each card is sorted by ID with its form/level features attached. The model has no arbitrary card-position embedding.

| Array | Shape | Meaning |
|---|---|---|
| `card_ids` | N × 2 × 8 | Training-vocabulary embedding indexes; 0 padding, 1 unknown |
| `form_ids` | N × 2 × 8 | Raw categorical API `evolutionLevel` codes 0–3 |
| `card_numeric` | N × 2 × 8 × 5 | Display level/16, elixir/10, cost-present flag, Mirror variable-cost flag, form-field-present flag |
| `tower_ids` | N × 2 | Separate tower troop embedding indexes |
| `tower_level` | N × 2 | Tower troop display level/16 |
| `starting_rating` | N × 2 | Pre-match `startingTrophies`/4000; optional skill-control feature |
| `league_number` | N | Ranked cohort: 5 Grand Champion, 6 Royal Champion, 7 Ultimate Champion; audit/slice metrics only |
| `label` | N | 1 if side A wins; 0 if side B wins |
| `weight` | N | Temporal loss weight for training; 1 for evaluation |
| `timestamp` | N | UTC Unix battle time, audit/splitting only |
| `match_id` | N | SHA-256 physical-match identity, audit only |
| `player_hash` | N × 2 | Pseudonyms for grouped evaluation, never model input |

These are token IDs and numeric features, not precomputed embeddings. The model learns embedding vectors during training. All matches have exactly eight cards per side and one tower troop per side, so padding masks are unnecessary for this export. Unknown cards are real tokens, not padding. Forms retain API codes; catalog images and collected records support base 0, Evolution 1 and Hero 2. See EXPERIMENT_REPORT.md for the canonical registry and limits. Source card ordering remains in the raw database if later slot research requires it.

Display level = API level + rarity offset: common 0, rare 2, epic 5, legendary 8, champion 10. Raw `maxLevel` and range validation catch inconsistent records. This is versioned for the current level-16 dataset, not claimed universal for future updates. Mirror's missing static elixir cost becomes value 0 **with a missing/variable flag**, not a claim that Mirror is free. Do not compute an ordinary unmasked average elixir across Mirror decks.

## Deduplication and leakage controls

The database key is SHA-256 of battle timestamp, sorted participant tags, battle type, and mode ID. Swapping team/opponent yields the same key. It is a synthetic physical-match identity, not a hash of the decks: two distinct games played with identical decks remain distinct. SQLite's primary key prevents repeated insertion. Tests cover reversed API views through the full database insertion path.

Each export is a consistent SQLite read snapshot while the collector continues writing. Source row/payload hashes and artifact SHA-256 values are recorded. Outcomes require unequal valid crowns. UC also requires corroborating trophy-change signs; Grand/Royal Champion may omit these API fields. Missing lower-league starting rating becomes zero context, which the deck-only model ignores. Equal crowns, inconsistent outcomes, malformed levels, unsupported tower counts or unknown forms are excluded with counts in the manifest. Outcome fields establish labels but never enter feature tensors. Schema 2 also records the requested league cohort and per-split league counts.

Chronological splits use approximately 80%/10%/10% of games, keeping identical timestamps on the same side of boundaries. No random train/test split and no duplicated flipped matches. Vocabularies are fitted to training rows only. Future unseen cards become UNK. Fixed level/rating divisors do not fit statistics on validation/test data. Time weights are `2 ** (-age_days / 14)`, measured relative to the **training cutoff**, not today's clock; evaluation weights remain one. Compare half-lives later, not using test-set feedback.

The current pilot may have narrow validation/test time spans because most games are recent. This checks ingestion, not long-term robustness. Shared players can occur across temporal splits; player-disjoint evaluation and multi-patch backtesting are still required. Patch IDs are deliberately absent until a verified effective-time calendar exists. Timestamp is retained to join that calendar later. Player hashes are reversible by dictionary lookup and are pseudonyms, not anonymization; do not publish them casually.

## Attention ingestion

`MatchDataset` exposes only the six approved input tensors plus label and sample weight. The fully trained `MatchupAttention` has 124,865 parameters: joint card/form embeddings, numeric projection, a tower token, two shared self-attention layers, cross-attention and an antisymmetric score. The deck-only model ignores rating inputs. See [EXPERIMENT_REPORT.md](EXPERIMENT_REPORT.md) for the frozen data, actual metrics and learning guide.

At inference, use the frozen vocabulary and the same level normalization. The lab server verifies complete, legal decks and supported forms. It reproduces all twelve exported training examples exactly. `train.py` accepts schema 2 exports, preserves the same attention architecture, trains up to 30 epochs with validation early stopping, calibrates on a later validation half, and reports aggregate plus per-league held-out metrics.

## Validation results

The frozen export contains 150,395 usable games. After training, calibration and held-out evaluation, the attention model achieved 55.13% test accuracy and 0.6842 log loss. Export validation checks every array, file checksums, match uniqueness and temporal boundaries. The automated suite passes all 19 tests. The local research lab visualizes actual trained attention and evaluation curves.

References: [PyTorch MultiheadAttention](https://docs.pytorch.org/docs/stable/generated/torch.nn.MultiheadAttention.html), [Supercell's card-level table](https://supercell.com/en/games/clashroyale/blog/news/coming-in-the-next-update/).
