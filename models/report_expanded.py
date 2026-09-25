"""Render the expanded run's measured results without inventing missing metrics."""
import argparse
import json
from pathlib import Path
from collect import ROOT


def main():
    p=argparse.ArgumentParser();p.add_argument('--run',type=Path,required=True);args=p.parse_args()
    run=args.run;m=json.loads((run/'metrics.json').read_text());c=json.loads((run/'comparison.json').read_text(encoding='utf-8-sig'))
    d=json.loads((run/'diagnostics.json').read_text());a=m['models']['attention'];test=a['test'];counts=m['split_counts']
    lines=['# Experiment 002: expanded Ranked data','',
        f"Frozen source: {m['data_manifest']['snapshot_raw_count']:,} unique matches. Usable export: {sum(counts.values()):,}; prior test IDs are excluded. Grand/Royal Champion labels use decisive crowns because rating/trophy fields can be omitted; UC requires corroborating trophy signs. Missing lower-league rating context is zero, and the attention model ignores rating.",'',
        '## Actual held-out results','', '| Model | Accuracy | Log loss | AUC |','|---|---:|---:|---:|']
    for key,label in [('attention','Attention'),('card_linear','Card/form linear'),('rating_only','Rating only'),('chance','Constant 50/50')]:
        r=m['models'][key]['test'];lines.append(f"| {label} | {r['accuracy']:.2%} | {r['log_loss']:.4f} | {r['auc']:.4f} |")
    lines+=['','| Partition | Matches |','|---|---:|']+[f'| {k} | {v:,} |' for k,v in counts.items()]
    lines+=['',f"Same architecture as experiment001: {a['parameters']:,} parameters, 64-dimensional joint card/form embeddings, two shared self-attention layers, four-head cross-attention, antisymmetric scoring. Seed42, AdamW0.0006, batch512, 14-day recency half-life. Selected epoch {a['best_epoch']} from {len(a['history'])} executed epochs (maximum30, validation early stopping). Temperature {a['temperature']:.4f} fitted separately on calibration. Test outcomes were not used for those choices.",'',
        '## Like-for-like future comparison','',
        'Both checkpoints are scored on the same new test games, excluding every old split ID and requiring timestamps later than the entire old test window. This controls the evaluated matches, but the new experiment changes training population and training duration; it is not a pure data-size ablation.','',
        '| Cohort | Games | Old accuracy | New accuracy | Old log loss | New log loss |','|---|---:|---:|---:|---:|---:|']
    for key,r in c['slices'].items():
        if not r:continue
        old,new=r['old_attention'],r['new_attention']
        lines.append(f"| {key} | {r['rows']:,} | {old['accuracy']:.2%} | {new['accuracy']:.2%} | {old['log_loss']:.4f} | {new['log_loss']:.4f} |")
    lines+=['','See the run `comparison.json` for paired bootstrap differences and approximate player-grouped intervals. Shared players and short chronology remain limitations. The old model was trained only on UC; the UC comparison is the central comparison.','',
        '## Confidence and coverage','',f"Training contains {d['unique_training_decks']:,} distinct card/form decks. Top ten deck share: {d['top10_training_deck_share']:.2%}. Unseen test deck share: {d['unseen_test_deck_fraction']:.2%} (ignoring levels and towers).",'',
        '| Favorite probability | Games | Observed favorite wins |','|---|---:|---:|']
    for b in d['confidence_bins']:
        acc='—' if b['accuracy'] is None else f"{b['accuracy']:.2%}"
        lines.append(f"| {b['min']:.0%}–{b['max']:.0%} | {b['games']:,} | {acc} |")
    lines+=['','These post-hoc bins describe natural held-out matches. They do not validate probabilities for artificially extreme decks or search-selected counter-decks. More extreme outputs are not inherently more accurate. No individual user matchup was used for tuning.','',
        '## Counter-deck creator','',
        'The local lab offers observed training seeds plus a bounded diverse beam search over legal one-card changes. It evaluates up to1,536 candidates, stays within two changes of a frequent training deck, supports locked cards, fixed candidate levels and elixir constraints, and returns up to three distinct choices. It enforces eight distinct base cards, at most two Evolutions, at most two Heroes/Champions and at most three special slots total. Tower choice remains user-controlled. A fixed penalty for changes favors supported candidates; it is not a statistical confidence bound. Search estimates are not measured real win rates or proof of a global optimum.','',
        '## Daily operation','',
        'The Codex local scheduled task runs at03:00 local time, targeting200,000 new unique games within one hour. Python performs collection and deduplication; gpt-5.6-luna invokes it and checks the audit report. Computer/app/network and available agent usage are required. See DAILY_INGESTION.md. Daily ingestion does not automatically promote models.','',
        '## Next model experiment','',
        'Use a fresh future holdout before selecting further changes. Compare explicit cross-deck card-pair interactions and within-deck synergies against attention; then consider card-role features such as target type, range, damage type and win-condition role with verified, versioned sources. Evaluate probability calibration and uncommon-deck coverage, not merely aggregate accuracy. Mechanically verified features should not be replaced by hand-labelled win probabilities.','',
        f'Run: `{run}`',f"Dataset: `{m['dataset']}`"]
    (ROOT/'EXPERIMENT_002.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print(str(ROOT/'EXPERIMENT_002.md'))


if __name__=='__main__': main()
