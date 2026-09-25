"""Full-array QA for a prepared export, including temporal separation and hashes."""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from collect import ROOT


def verify(directory):
    manifest = json.loads((directory/'manifest.json').read_text())
    vocab = json.loads((directory/'vocabulary.json').read_text())
    all_ids = set()
    prior_max = None
    details = {}
    for split in ('train','validation','test'):
        path = directory/(split+'.npz')
        assert hashlib.sha256(path.read_bytes()).hexdigest() == manifest['splits'][split]['sha256']
        with np.load(path, allow_pickle=False) as d:
            n = len(d['label'])
            assert d['card_ids'].shape == (n,2,8)
            assert d['form_ids'].shape == (n,2,8)
            assert d['card_numeric'].shape == (n,2,8,5)
            assert d['tower_ids'].shape == (n,2)
            # Schema 1 pilot exports predate league slice metadata.  Keep them
            # verifiable; schema 2 exports must carry the explicit cohort.
            if 'league_number' in d.files:
                assert d['league_number'].shape == (n,)
                assert np.isin(d['league_number'], [5, 6, 7]).all()
            elif manifest.get('schema_version', 1) >= 2:
                raise AssertionError('schema 2 export missing league_number')
            for key in ('card_numeric','tower_level','starting_rating','label','weight'):
                assert np.isfinite(d[key]).all(), key
            assert np.isin(d['label'],[0,1]).all()
            assert ((d['form_ids'] >= 0) & (d['form_ids'] <= 3)).all()
            assert ((d['card_ids'] > 0) & (d['card_ids'] < len(vocab['cards'])+2)).all()
            assert ((d['tower_ids'] > 0) & (d['tower_ids'] < len(vocab['towers'])+2)).all()
            assert ((d['weight'] > 0) & (d['weight'] <= 1)).all()
            ids = set(d['match_id'].tolist())
            assert len(ids) == n and not (ids & all_ids)
            all_ids.update(ids)
            lo, hi = int(d['timestamp'].min()), int(d['timestamp'].max())
            assert prior_max is None or prior_max < lo
            prior_max = hi
            details[split] = {'rows':n,'min_time':lo,'max_time':hi}
    assert len(all_ids) == manifest['normalized_rows']
    result = {'passed':True,'unique_rows':len(all_ids),'splits':details,
              'checks':['finite tensors','valid token ranges','file SHA-256','no cross-split match duplicates','strict temporal separation']}
    (directory/'validation.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(result))


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--directory',type=Path)
    args = p.parse_args()
    directory = args.directory or Path(json.loads((ROOT/'data/training/latest.json').read_text())['directory'])
    verify(directory)
