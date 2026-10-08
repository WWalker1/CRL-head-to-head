"""Post-hoc coverage/confidence audit; does not train or select a model."""
from collections import Counter
import argparse
import json
from pathlib import Path
import numpy as np


def deck_keys(data):
    return [tuple(sorted(zip(c.tolist(),f.tolist()))) for c,f in
            zip(data['card_ids'].reshape(-1,8),data['form_ids'].reshape(-1,8))]


def main():
    p=argparse.ArgumentParser();p.add_argument('--run',type=Path,required=True);args=p.parse_args()
    report=json.loads((args.run/'metrics.json').read_text());folder=Path(report['dataset'])
    with np.load(folder/'train.npz') as train: counts=Counter(deck_keys(train))
    with np.load(folder/'test.npz') as test:
        decks=deck_keys(test); seen=np.array([d in counts for d in decks]).reshape(-1,2)
    with np.load(args.run/'attention-test-predictions.npz') as pred:
        probability=1/(1+np.exp(-pred['logits']/report['models']['attention']['temperature']));labels=pred['labels']
    favorite=np.maximum(probability,1-probability);correct=(probability>=.5)==labels
    bins=[]
    for lo,hi in ((.5,.55),(.55,.6),(.6,.65),(.65,.7),(.7,.8),(.8,1.00001)):
        mask=(favorite>=lo)&(favorite<hi)
        bins.append({'min':lo,'max':min(hi,1),'games':int(mask.sum()),
                     'average_confidence':float(favorite[mask].mean()) if mask.any() else None,
                     'accuracy':float(correct[mask].mean()) if mask.any() else None})
    slices={}
    for name,mask in [('both_decks_seen',seen.all(1)),('one_or_both_unseen',~seen.all(1))]:
        slices[name]={'games':int(mask.sum()),'accuracy':float(correct[mask].mean()) if mask.any() else None}
    result={'unique_training_decks':len(counts),'top10_training_deck_share':sum(n for _,n in counts.most_common(10))/sum(counts.values()),
            'unseen_test_deck_fraction':float((~seen).mean()),'confidence_bins':bins,'coverage_slices':slices,
            'interpretation':'Descriptive post-hoc audit. No confidence threshold is selected or validated for deployment. Deck identity includes forms but ignores levels and towers.'}
    (args.run/'diagnostics.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))


if __name__=='__main__':main()
