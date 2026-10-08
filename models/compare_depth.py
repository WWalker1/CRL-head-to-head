"""Exploratory fixed-test depth comparison; checkpoint selection uses validation."""
import argparse,json
from pathlib import Path
import numpy as np
from compare_runs import paired_bootstrap

p=argparse.ArgumentParser();p.add_argument('--shallow',type=Path,required=True);p.add_argument('--deep',type=Path,required=True);a=p.parse_args()
sm=json.loads((a.shallow/'metrics.json').read_text());dm=json.loads((a.deep/'metrics.json').read_text())
assert sm['dataset']==dm['dataset']
s=sm['models']['attention'];d=dm['models']['attention']
with np.load(a.shallow/'attention-test-predictions.npz') as sp,np.load(a.deep/'attention-test-predictions.npz') as dp:
    assert np.array_equal(sp['match_id'],dp['match_id']) and np.array_equal(sp['labels'],dp['labels'])
    difference=paired_bootstrap(sp['logits'],dp['logits'],sp['labels'],(s['temperature'],d['temperature']))
sv=min(h['validation_log_loss'] for h in s['history']);dv=min(h['validation_log_loss'] for h in d['history'])
report={'selection':'validation log loss','validation_selected_layers':4 if dv<sv else 2,
        'shallow_validation_log_loss':sv,'deep_validation_log_loss':dv,
        'shallow_test':s['test'],'deep_test':d['test'],'paired_difference':difference,
        'limitation':'Exploratory comparison on the already-inspected expanded test set. A new future holdout is needed for confirmatory evaluation. No test-based hyperparameter tuning or automatic deployment.'}
(a.deep/'depth-comparison.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'validation_selected_layers':report['validation_selected_layers'],'shallow_accuracy':s['test']['accuracy'],'deep_accuracy':d['test']['accuracy'],'deep_log_loss':d['test']['log_loss'],'difference':difference}))
