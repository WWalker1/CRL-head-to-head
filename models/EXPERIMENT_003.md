# Four-layer attention experiment

Same frozen data as experiment002:389089 training games,48635 combined validation/calibration,48638 test games. Four shared self-attention layers instead of two; width64 and four heads unchanged. Maximum20 epochs with validation early stopping; stopped after6 epochs. The test set was already inspected in experiment002, so this is exploratory, not a new confirmatory holdout.

| Model | Test accuracy | Log loss | AUC |
|---|---:|---:|---:|
| Two layers |57.77%|0.6734|0.6111|
| Four layers |52.26%|0.6912|0.5336|

Validation also selected the two-layer model: best log loss0.67218 versus0.69080. The lab retains the two-layer checkpoint. This experiment shows that this deeper configuration and training recipe underperformed; it does not establish that every deeper architecture is worse. The next architectural experiment should examine optimization, initialization and explicit card-pair interactions, using a fresh holdout for confirmation.

Full metrics and paired differences: `data/runs/20260923T004801Z/depth-comparison.json`. Checkpoints were preserved; no production changes.

Community collection is separate. Supabase player tags seed available Clash Royale logs and opponent BFS. All modes are archived with cohort labels; unknown/modified modes are not silently added to the model's normal Ranked training set. Physical hashes deduplicate within the community archive; overlap with the main archive is explicitly counted so totals are not double-counted.
