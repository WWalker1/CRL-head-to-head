"""Bounded legal deck search. Scores are model estimates, not measured win rates."""
from collections import Counter
import json
from pathlib import Path
import random
import numpy as np


def legal(keys, lookup, complete=True):
    if (complete and len(keys)!=8) or len(keys)>8 or any(k not in lookup for k in keys): return False
    cards=[lookup[k] for k in keys]
    if len({c['card_id'] for c in cards})!=len(cards): return False
    evo=sum(c['form']==1 for c in cards)
    hero=sum(c['form']==2 or c['champion'] for c in cards)
    return evo<=2 and hero<=2 and evo+hero<=3


def build_seeds(directory):
    """Use training decks only. Neither outcomes nor validation/test decks seed search."""
    directory=Path(directory); vocab=json.loads((directory/'vocabulary.json').read_text())
    inverse={v:k for k,v in vocab['cards'].items()}
    counts=Counter()
    with np.load(directory/'train.npz') as data:
        for ids,forms in zip(data['card_ids'].reshape(-1,8),data['form_ids'].reshape(-1,8)):
            if any(int(c) not in inverse for c in ids): continue
            keys=tuple(sorted(f'{inverse[int(c)]}:{int(f)}' for c,f in zip(ids,forms)))
            counts[keys]+=1
    seeds=[{'keys':list(k),'count':v} for k,v in counts.most_common(4000) if v>=3]
    (directory/'search-seeds.json').write_text(json.dumps(seeds),encoding='utf-8')
    return seeds


class CounterSearch:
    def __init__(self,catalog,seeds):
        self.lookup={c['key']:c for c in catalog['variants'] if c['train_occurrences']>0}
        self.seeds=[s for s in seeds if legal(s['keys'],self.lookup)]
        self.pool=sorted((k for k,c in self.lookup.items() if c['train_occurrences']>=100),
                         key=lambda k:(-self.lookup[k]['train_occurrences'],k))

    def search(self,score,locked=(),level=16,tower_id=None,tower_level=16,budget=2048,
               rounds=3,beam=16,min_elixir=2.5,max_elixir=5.0):
        if type(level) is not int or not 1<=level<=16: raise ValueError('Card level must be 1 to 16.')
        if not legal(locked,self.lookup,False): raise ValueError('Locked cards violate the deck or special-slot rules.')
        if any(self.lookup[k]['min_level']>level for k in locked): raise ValueError('A locked card cannot use the selected level.')
        if not 128<=budget<=4096: raise ValueError('Search budget must be 128 to 4096.')
        if not 1<=min_elixir<=max_elixir<=10: raise ValueError('Invalid elixir range.')
        locked=set(locked); rng=random.Random(42); pool=[k for k in self.pool if self.lookup[k]['min_level']<=level]
        cache={}; origins={}; raw_counts={tuple(s['keys']):s['count'] for s in self.seeds}

        def valid(keys):
            if not legal(keys,self.lookup) or not locked.issubset(keys): return False
            cs=[self.lookup[k] for k in keys]
            if any(c['min_level']>level for c in cs): return False
            costs=[c['elixir'] for c in cs if c['elixir'] is not None]
            return bool(costs) and min_elixir<=sum(costs)/len(costs)<=max_elixir

        def deck(keys):
            return {'cards':[{'key':k,'level':level} for k in keys], 'tower_id':tower_id,'tower_level':tower_level}

        def evaluate(candidates):
            pending=[]
            for keys,origin in candidates:
                keys=tuple(sorted(keys))
                if keys in cache or not valid(keys): continue
                # Stay within two changed forms/cards of an actual training deck.
                if len(set(keys)-set(origin))>2: continue
                if keys not in origins:
                    origins[keys]=origin; pending.append(keys)
                if len(cache)+len(pending)>=budget: break
            for start in range(0,len(pending),128):
                batch=pending[start:start+128]; probabilities=score([deck(k) for k in batch])
                if len(probabilities)!=len(batch): raise RuntimeError('Scorer returned the wrong number of predictions.')
                for keys,prob in zip(batch,probabilities):
                    prob=float(prob)
                    if not np.isfinite(prob) or not 0<=prob<=1: raise RuntimeError('Scorer returned an invalid probability.')
                    changes=len(set(keys)-set(origins[keys]))
                    # Fixed heuristic discourages optimizer exploitation of unsupported combinations.
                    cache[keys]={'probability':prob,'rank_score':prob-.025*changes,'changes':changes}

        candidates=[]
        ordered=sorted(self.seeds,key=lambda s:(-len(set(s['keys'])&locked),-s['count']))
        for seed in ordered:
            original=tuple(seed['keys']); keys=list(original)
            missing=sorted(locked-set(keys))
            for k in missing:
                same=[x for x in keys if self.lookup[x]['card_id']==self.lookup[k]['card_id']]
                removable=same or [x for x in reversed(keys) if x not in locked]
                if not removable: break
                keys.remove(removable[0]);keys.append(k)
            candidates.append((keys,original))
        # Retain most budget for local improvements, not scanning seed decks alone.
        evaluate(candidates[:min(768,budget//2)])
        for _ in range(rounds):
            if len(cache)>=budget or not cache or len(locked)==8: break
            ranked=sorted(cache,key=lambda k:-cache[k]['rank_score'])
            parents=[]
            for k in ranked:
                if all(len(set(k)-set(p))>=2 for p in parents): parents.append(k)
                if len(parents)>=beam: break
            mutations=[]
            for parent in parents:
                replace=[k for k in parent if k not in locked];rng.shuffle(replace)
                choices=list(pool);rng.shuffle(choices)
                for card in choices:
                    for old in replace:
                        if card in parent: continue
                        child=[k for k in parent if k!=old]+[card]
                        mutations.append((child,origins[parent]))
            rng.shuffle(mutations)
            # Divide remaining budget across rounds to permit sequential improvements.
            allowance=max(1,(budget-len(cache))//(rounds-_))
            eligible=[]; seen=set(cache)
            for keys,origin in mutations:
                key=tuple(sorted(keys))
                if key in seen or not valid(key) or len(set(key)-set(origin))>2: continue
                seen.add(key);eligible.append((key,origin))
                if len(eligible)>=allowance: break
            evaluate(eligible)
        if not cache: raise ValueError('No supported legal deck fits these locks, levels and elixir limits. Relax a constraint.')
        selected=[]
        for keys in sorted(cache,key=lambda k:(-cache[k]['rank_score'],k)):
            if any(len(set(keys)-set(x['keys']))<2 for x in selected): continue
            entry=cache[keys]
            selected.append({'keys':list(keys),'deck':deck(keys),**entry,
                'training_deck_appearances':raw_counts.get(keys,0),
                'min_card_form_appearances':min(self.lookup[k]['train_occurrences'] for k in keys),
                'seed_keys':list(origins[keys])})
            if len(selected)==3: break
        return {'candidates':selected,'evaluated':len(cache),'budget':budget,
            'method':'Observed training seeds + diverse beam search with legal single-card substitutions; at most two changes from a seed.',
            'ranking_policy':'Model probability minus 2.5 percentage points per changed card/form from the observed seed. This is a heuristic, not a confidence bound.',
            'warning':'Search-selected model estimates are not measured win rates. Searching can exploit model errors; no global optimum or real win rate is guaranteed.'}
