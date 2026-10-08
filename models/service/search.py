"""Budgeted complete-deck search; no partial-deck outcome predictions."""
from collections import Counter
import math
import random
import time


class DeckSearch:
    def __init__(self, runtime):
        self.runtime = runtime
        self.lookup = runtime.lookup
        self.seeds = sorted(runtime.seeds, key=lambda s: -s['count'])
        self.counts = {tuple(sorted(s['keys'])): s['count'] for s in self.seeds}
        self.pool = sorted((k for k, c in self.lookup.items() if c.get('train_occurrences', 0) >= 100),
                           key=lambda k: -self.lookup[k]['train_occurrences'])
        self.pairs = Counter()
        for seed in self.seeds:
            for a in seed['keys']:
                for b in seed['keys']:
                    if a != b: self.pairs[a, b] += seed['count']

    def legal(self, keys, level, complete=True):
        if (len(keys) != 8 if complete else len(keys) > 8): return False
        if any(k not in self.lookup or not self.lookup[k].get('train_occurrences') for k in keys): return False
        cards = [self.lookup[k] for k in keys]
        if len({c['card_id'] for c in cards}) != len(keys): return False
        evos = sum(c['form'] == 1 for c in cards)
        heroes = sum(c['form'] == 2 or c['champion'] for c in cards)
        return evos <= 2 and heroes <= 2 and evos + heroes <= 3 and all(c['min_level'] <= level <= 16 for c in cards)

    def run(self, *, locked=(), excluded=(), level=16, tower_id=None, tower_level=16,
            target=None, targets=None, budget=512, seconds=2.5):
        start = time.monotonic(); deadline = start + seconds
        locked = tuple(locked); excluded = set(excluded)
        if len(locked) != len(set(locked)) or not self.legal(locked, level, False):
            raise ValueError('Locked cards violate the card, level or special-slot rules.')
        if excluded.intersection(locked): raise ValueError('A locked card cannot also be excluded.')
        if any(k not in self.lookup for k in excluded): raise ValueError('Unknown excluded card.')
        tower_id = tower_id or next((t['id'] for t in self.runtime.catalog['towers'] if t.get('train_occurrences')), None)
        def deck(keys):
            return {'cards': [{'key': k, 'level': level} for k in keys], 'tower_id': tower_id, 'tower_level': tower_level}
        pool = [k for k in self.pool if k not in excluded and self.lookup[k]['min_level'] <= level]
        rng = random.Random(42)
        ranked_pool = sorted(pool, key=lambda k: -(sum(self.pairs[k, a] for a in locked) + math.log1p(self.lookup[k]['train_occurrences'])))
        exploration = ranked_pool[40:]; rng.shuffle(exploration)
        mutation_pool = ranked_pool[:40] + exploration[:16]
        def repair(seed):
            keys = list(locked)
            if len(keys) == 8: return tuple(sorted(keys))
            for k in list(seed) + ranked_pool:
                if k in excluded or k in keys: continue
                if self.legal(keys + [k], level, False): keys.append(k)
                if len(keys) == 8: return tuple(sorted(keys))
            return None
        initial = []; seen = set()
        ranked_seeds = sorted(self.seeds, key=lambda s: (-len(set(s['keys']).intersection(locked)), -s['count']))
        for seed in ranked_seeds:
            if time.monotonic() >= deadline: break
            keys = repair(seed['keys'])
            if keys and keys not in seen: initial.append(keys); seen.add(keys)
            if len(initial) >= min(budget, 192): break
        if not initial: raise ValueError('No legal completion fits these constraints.')
        self.runtime.tensorize([deck(initial[0]), deck(initial[0])])
        if target is not None: targets = [{'deck': target, 'weight': 1.0}]
        meta = targets is None
        opponents = []
        if meta:
            for seed in self.seeds:
                if self.legal(seed['keys'], level): opponents.append({'deck': deck(seed['keys']), 'weight': float(seed['count'])})
                if len(opponents) >= 100: break
        else: opponents = targets
        if not opponents: raise ValueError('No supported opponents are available.')
        for item in opponents:
            if not math.isfinite(item['weight']) or item['weight'] <= 0: raise ValueError('Opponent weights must be positive.')
            self.runtime.tensorize([item['deck'], item['deck']])
        coarse = opponents[:8] if meta else opponents
        scores = {}; evaluated = set(); pairs_scored = 0
        def evaluate(keys_list, basket, stop_at):
            nonlocal pairs_scored
            result = {}; step = max(1, 128 // len(basket))
            weights = [o['weight'] for o in basket]; total = sum(weights)
            for at in range(0, len(keys_list), step):
                if time.monotonic() >= stop_at: break
                group = keys_list[at:at + step]
                probabilities = self.runtime.predict_batch([[deck(keys), o['deck']] for keys in group for o in basket])
                pairs_scored += len(group) * len(basket); evaluated.update(group)
                for i, keys in enumerate(group):
                    values = probabilities[i * len(basket):(i + 1) * len(basket)]
                    result[keys] = (sum(p * w for p, w in zip(values, weights)) / total, min(values))
            return result
        coarse_deadline = start + seconds * (0.60 if meta else 0.94)
        scores.update(evaluate(initial, coarse, coarse_deadline))
        if not scores: raise ValueError('Search deadline reached before a candidate could be scored. Retry.')
        for _round in range(2):
            if len(evaluated) >= budget or time.monotonic() >= coarse_deadline: break
            proposals = []
            for keys in self.diverse(scores, 12):
                for old in keys:
                    if old in locked: continue
                    for new in mutation_pool:
                        candidate = tuple(sorted([k for k in keys if k != old] + [new]))
                        if candidate in seen or not self.legal(candidate, level): continue
                        seen.add(candidate); proposals.append(candidate)
            rng.shuffle(proposals)
            scores.update(evaluate(proposals[:budget - len(evaluated)], coarse, coarse_deadline))
        scored_basket = coarse
        if meta and time.monotonic() < deadline:
            refined = evaluate(self.diverse(scores, 8), opponents, deadline)
            if refined: scores = refined; scored_basket = opponents
        chosen = self.diverse(scores, 3)
        candidates = []
        for keys in chosen:
            probability, worst = scores[keys]; occurrences = self.counts.get(keys, 0)
            nearest = max(len(set(keys).intersection(s['keys'])) for s in self.seeds)
            candidates.append({'deck': deck(keys), 'probability': probability, 'worst_matchup': worst,
                               'training_deck_appearances': occurrences, 'nearest_seed_overlap': nearest,
                               'support': 'observed' if occurrences else 'experimental',
                               'explanation': f'Estimated against {len(scored_basket)} complete opposing decks. ' +
                               (f'Combination appeared {occurrences} times in the training seed catalog.' if occurrences else f'Novel combination; closest training seed shares {nearest} of eight cards.')})
        return {'candidates': candidates, 'evaluated': len(evaluated), 'pair_predictions': pairs_scored,
                'budget': budget, 'elapsed_ms': round((time.monotonic() - start) * 1000),
                'deadline_reached': time.monotonic() >= deadline, 'opponents_evaluated': len(scored_basket),
                'basket_coverage': sum(o['weight'] for o in scored_basket) / sum(o['weight'] for o in opponents),
                'objective': 'historical_training_meta' if meta else 'selected_opponents',
                'method': 'Frequency/co-occurrence proposals, legal repair, diverse mutation beam, batched staged scoring.',
                'warning': 'Search-selected model estimates, not measured win rates or a global optimum. General scores use historical training frequencies.',
                'model_version': self.runtime.manifest['model_id']}

    @staticmethod
    def diverse(scores, count):
        selected = []
        for keys in sorted(scores, key=lambda k: -scores[k][0]):
            if all(len(set(keys).intersection(other)) <= 6 for other in selected): selected.append(keys)
            if len(selected) == count: break
        return selected
