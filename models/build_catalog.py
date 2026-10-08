"""Canonical card/form registry and training support counts for the local lab."""
from collections import Counter
import json
from pathlib import Path
import sqlite3
import zlib
import numpy as np
from collect import ROOT


def build(directory):
    source=sorted((ROOT/'data/ultimate-champion').glob('cards-*.json'))[-1]
    catalog=json.loads(source.read_text()); vocab=json.loads((directory/'vocabulary.json').read_text())
    with np.load(directory/'train.npz') as d:
        counts=Counter(zip(d['card_ids'].ravel().tolist(),d['form_ids'].ravel().tolist()))
        towers=Counter(d['tower_ids'].ravel().tolist())
    result={'catalog_source':str(source),'dataset':str(directory),'base_card_count':len(catalog['items']),
            'form_policy':'0 base; 1 Evolution; 2 Hero. Code 3 is ambiguous and is not offered for inference.',
            'variants':[],'towers':[]}
    for c in catalog['items']:
        forms=[0]
        if 'evolutionMedium' in c.get('iconUrls',{}): forms.append(1)
        if 'heroMedium' in c.get('iconUrls',{}): forms.append(2)
        for form in forms:
            index=vocab['cards'].get(str(c['id']),1)
            name={0:c['name'],1:'Evo '+c['name'],2:'Hero '+c['name']}[form]
            result['variants'].append({'key':f"{c['id']}:{form}",'card_id':c['id'],'form':form,'name':name,
                'base_name':c['name'],'rarity':c['rarity'],'elixir':c.get('elixirCost'),
                'image':c.get('iconUrls',{}).get({0:'medium',1:'evolutionMedium',2:'heroMedium'}[form]),
                'vocab_index':index,'joint_embedding_index':index*4+form,'train_occurrences':counts[(index,form)] if index!=1 else 0,
                'champion':c['rarity']=='champion','min_level':{'common':1,'rare':3,'epic':6,'legendary':9,'champion':11}[c['rarity']]})
    for c in catalog['supportItems']:
        index=vocab['towers'].get(str(c['id']),1)
        result['towers'].append({'id':c['id'],'name':c['name'],'image':c['iconUrls']['medium'],
                                 'vocab_index':index,'train_occurrences':towers[index] if index!=1 else 0})
    result['variants'].sort(key=lambda c:(c['base_name'],c['form']))
    (directory/'card-catalog.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    # Example decks from training only; never expose player IDs.
    inverse={v:int(k) for k,v in vocab['cards'].items()}; tower_inverse={v:int(k) for k,v in vocab['towers'].items()}
    examples=[]
    with np.load(directory/'train.npz') as d:
        for i in np.linspace(0,len(d['label'])-1,12,dtype=int):
            sides=[]
            for side in range(2):
                sides.append({'cards':[{'key':f"{inverse[int(c)]}:{int(f)}",'level':int(round(float(l)*16))}
                                      for c,f,l in zip(d['card_ids'][i,side],d['form_ids'][i,side],d['card_numeric'][i,side,:,0])],
                              'tower_id':tower_inverse[int(d['tower_ids'][i,side])],
                              'tower_level':int(round(float(d['tower_level'][i,side])*16))})
            examples.append({'name':f'Training matchup {len(examples)+1}','decks':sides})
    (directory/'examples.json').write_text(json.dumps(examples,indent=2),encoding='utf-8')
    print(json.dumps({'variants':len(result['variants']),'observed_variants':sum(c['train_occurrences']>0 for c in result['variants']),
                      'base_cards':result['base_card_count'],'examples':len(examples)}))
    return result


if __name__=='__main__':
    directory=Path(json.loads((ROOT/'data/training/latest.json').read_text())['directory'])
    build(directory)
