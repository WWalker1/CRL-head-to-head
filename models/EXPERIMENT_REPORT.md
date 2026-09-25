# Experiment 001: deck matchup attention

Completed September 21, 2026. All work is isolated under `models/`; the production app and Supabase were not changed.

## Open the experiment

Run `./models/start_lab.ps1` from the repository root, then open http://127.0.0.1:8766. Keep that terminal running. The server is local only.

- **Matchup arena:** build two eight-card decks, select separate base/Evolution/Hero forms, card levels and tower troops, and obtain calibrated predictions.
- **Inside the model:** clickable architecture stages, actual embedding activations, four attention heads, self/cross-attention heatmaps and a simplified token connection graph. These are weights from the trained network for the selected matchup. Attention is information mixing, not causal evidence of a counter.
- **Evaluation:** held-out metrics, training curves, calibration and split methodology.

Partial decks can be assembled interactively, but prediction requires eight cards. Automated completion recommendations are a future experiment, not an implemented or evaluated feature.

## Dataset and harvesting

150,419 distinct Ultimate Champion matches were collected; 150,395 decisive matches are usable, with 24 tied-crown records excluded. Collection stopped after reaching the 150,000 target. The persistent candidate frontier contains 29,662 player IDs, including opponents discovered from accepted games. No Supabase accounts were needed.

The collector expands regional leaderboard seeds through opponents. It uses bounded concurrency, a shared request limiter, retries and SQLite checkpoints. A SHA-256 key over timestamp, sorted player tags, type and mode ID deduplicates both players' views of a physical match. Repeated games with identical decks remain separate.

This experiment uses only normal Ranked Ultimate Champion 1v1, not Grand Champion or draft. Ultimate Champion is the highest of seven current Ranked leagues ([Supercell Ranked documentation](https://support.supercell.com/clash-royale/en/articles/ranked-3.html)). Grand/Royal Champion and verified normal draft have separate classification labels for future cohorts. Chaos, Touchdown, altered-elixir/rule modes and unknown modes are excluded or held for review. A draft name alone is insufficient: Supercell has also offered modified Chaos drafts ([season announcement](https://supercell.com/en/games/clashroyale/blog/news/new-season-k-h-a-o-s/)).

The current API catalog contains 123 base cards and four tower troops. The canonical registry exposes 182 observed base/form variants. Keys combine the stable card ID and observed form code: base 0, Evolution 1, Hero 2. This interpretation was checked against catalog image fields and collected records; ambiguous code 3 is not offered. Champions retain their distinct card identities. Levels are normalized from API rarity-relative values into displayed levels, then divided by 16. Mirror carries an explicit variable/missing-cost flag.

## Split and training

Games are sorted by battle time, with equal timestamps kept together. No physical match crosses a split. Vocabulary comes from training only.

| Partition | Games | Purpose |
|---|---:|---|
| Training | 120,316 | Learn network weights |
| Validation | 7,519 | Select best epoch |
| Calibration | 7,520 | Fit probability temperature |
| Test | 15,040 | Final untouched evaluation |

Training ends at 2026-09-20 22:06:01 UTC. Test begins at 2026-09-21 01:12:15 UTC. This is a short temporal holdout, not a multi-patch assessment. Players may appear in multiple splits.

The main model has 124,865 parameters, trained on CPU with seed 42 for ten epochs using AdamW, learning rate 0.0006, weight decay 0.01, batch size 512 and gradient clipping at 1. Training examples receive exponential recency weights with a 14-day half-life relative to the training cutoff; evaluation is unweighted. Epoch 9 was selected by validation log loss. Temperature 1.24294 was fitted on the separate calibration window. Test results were not used to select the epoch or temperature.

## How the network works

1. Each card/form pair has its own learned 64-number embedding. A linear projection adds level, elixir and missing/form flags. Each deck also has a tower/context token: nine tokens per side.
2. Two shared self-attention layers, each with four heads and a 128-wide feedforward block, mix information within each deck. This can learn combinations and synergies without hand-writing them.
3. Four-head cross-attention lets each deck's tokens consult the opposing deck. The model can learn matchup-dependent interactions.
4. Mean pooling produces one 64-number vector per deck. A shared scoring head processes both deck orderings. The final logit is `g(A,B) - g(B,A)`; swapping sides therefore complements the probability.
5. Sigmoid of the temperature-scaled logit gives the displayed win estimate, conditional on a decisive match.

There are no positional embeddings: rearranging cards does not change a deck's prediction. Player IDs, post-match statistics and outcomes never enter the features. The main network ignores starting rating; a separate rating-only baseline measures its predictive value. The model sees the Evolution-equipped card as a distinct form, but does not observe in-match evolution cycles, starting hand or play decisions.

## Held-out results

| Model | Accuracy | Log loss ↓ | Brier ↓ | AUC ↑ |
|---|---:|---:|---:|---:|
| Attention, calibrated | **55.13%** | **0.6842** | **0.2456** | **0.5748** |
| Linear card/form baseline | 51.04% | 0.6927 | 0.2498 | 0.5175 |
| Starting-rating baseline | 50.59% | 0.6931 | 0.2500 | 0.5070 |
| Constant 50/50 | 50.43% | 0.6931 | 0.2500 | 0.5000 |

Constant 50/50 accuracy reflects the deterministic tie-breaking side, not knowledge. Attention's approximate player-grouped 95% accuracy interval is 54.3–56.1%; bootstrap clustering separately by each side and taking the wider interval does not fully capture all dependence between players. Expected calibration error over ten bins is 0.0069. Confusion counts are TN 4,097; FP 3,359; FN 3,389; TP 4,195.

This is a modest measurable improvement over these initial baselines, not a production-quality counter-deck oracle. The linear baseline has not undergone extensive tuning. Similar decks and repeated players, narrow chronology, selection through leaderboard opponents and unobserved player skill limit the interpretation. Accuracy cannot establish a causal deck advantage. Test on later weeks, unseen players and balance patches before deployment. Predictions for rare forms, unusual combinations and low levels deserve particular caution.

## Verification and artifacts

All 19 automated tests pass, including reversed-view deduplication, mode rejection, metrics, gradient flow, trace consistency and side-swap symmetry. All 12 GUI example matchups reproduce their exported training features exactly. Export verification checks every array, hashes, uniqueness and split boundaries.

- Frozen data: `data/training/20260921T044709Z-653d169c/`
- Trained run: `data/runs/20260921T163430Z/`
- Run includes `attention.pt`, baseline checkpoints, `metrics.json`, training history and held-out predictions.
- `attention_data.py`: the small, readable network and dataset loader.
- `train.py`: optimization, baselines, calibration and evaluation.
- `lab_server.py`: inference using the saved checkpoint; `lab/`: standalone GUI.

## Next learning experiments

### Follow-up diagnosis

The training partition contains 25,214 distinct deck/form combinations, ignoring levels and towers. Its ten most frequent decks account for 11.35% of appearances. In the test set, 18.74% of deck appearances use combinations absent from training. Thus the dataset is not simply ten meta decks, although individual deck-pair coverage can still be sparse.

Post-hoc confidence inspection of the frozen test predictions (not a new model selection experiment):

| Predicted favorite probability | Test games | Favorite actually wins |
|---|---:|---:|
| 50–55% | 7,568 | 51.77% |
| 55–60% | 5,118 | 56.39% |
| 60–65% | 1,961 | 62.57% |
| 65–70% | 369 | 66.40% |
| 70%+ | 24 | 66.67% |

The highest-confidence bin is too small for a reliable claim. About half of predictions are close to a coin flip. This explains some of the low aggregate accuracy, but does not establish that those matchups are intrinsically unpredictable. At epoch 9, training loss was 0.6745 and validation loss 0.6807; epoch 10 improved training loss to 0.6692 while validation worsened to 0.6832. This suggests emerging overfitting, but one short run cannot establish the limiting factor. More data, stronger pairwise baselines, longer validation-selected training and skill-conditioned experiments should be compared on a newly reserved future test window. Keep league-specific cohorts and evaluations when adding Grand/Royal Champion matches; pooled lower-tier accuracy alone could reflect skill or level mismatches instead of improved deck interaction learning.

First reproduce the linear baseline, then add within-deck self-attention, then cross-attention, comparing validation loss at each step. Reserve a newly collected future test window before comparing more variants. Next add a masked-card completion objective: hide one or more cards from successful, legal training decks and predict the missing cards. A completion model can propose realistic candidates; the matchup model can rank full legal decks against a target or weighted opponent-deck distribution. This avoids treating an incomplete deck as if it were a valid eight-card matchup. Evaluate legality, held-out card recovery and later matchup outcomes separately.

Weekly retraining can reuse this collector/export pipeline, but should version patch windows, catalog and vocabulary alongside checkpoints. The existing 14-day decay is an initial setting, not a validated optimum.
