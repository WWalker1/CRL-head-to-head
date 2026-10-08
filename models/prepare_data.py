"""Export a consistent Ranked SQLite snapshot to leakage-controlled tensors.

The original pilot was Ultimate Champion only.  The exporter can now build a
mixed Grand/Royal/Ultimate Champion cohort while retaining the league on every
row for slice metrics.  The source database is read as one immutable snapshot;
the previous export is never modified.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sqlite3
import time
import zlib

import numpy as np
from collect import ROOT, identity
from mode_policy import RANKED_MODES

OFFSETS = {'common': 0, 'rare': 2, 'epic': 5, 'legendary': 8, 'champion': 10}
NUMERIC_FEATURES = ['display_level_div16', 'elixir_div10', 'elixir_present', 'variable_cost_mirror', 'form_field_present']


def level(card):
    rarity = card.get('rarity')
    raw = card.get('level')
    if rarity not in OFFSETS or type(raw) is not int or raw < 1:
        raise ValueError('invalid_level')
    result = raw + OFFSETS[rarity]
    if result > 16 or raw > card.get('maxLevel', 0):
        raise ValueError('invalid_level')
    return result


def accepted_ranked(b, source_tag, allowed_leagues=(7,), now=None, require_recent=True):
    """Validate a normal Ranked 1v1 battle for the requested league cohort."""
    if not (b.get('type') == 'pathOfLegend'
            and b.get('leagueNumber') in allowed_leagues
            and b.get('gameMode', {}).get('id') in RANKED_MODES
            and b.get('deckSelection') == 'collection'
            and not b.get('modifiers') and not b.get('isHostedMatch')
            and not b.get('isLadderTournament')):
        return False
    if source_tag not in [p.get('tag') for s in ('team', 'opponent') for p in b.get(s, [])]:
        return False
    if require_recent:
        try:
            played = datetime.strptime(b['battleTime'], '%Y%m%dT%H%M%S.%fZ').replace(tzinfo=timezone.utc).timestamp()
        except (KeyError, ValueError, TypeError):
            return False
        age = (time.time() if now is None else now) - played
        if not 0 <= age <= 30 * 86400:
            return False
    return True


def normalize(b, bid, fetched, allowed_leagues=(7,), require_recent=True):
    if identity(b) != bid:
        raise ValueError('hash_mismatch')
    if not accepted_ranked(b, b.get('team', [{}])[0].get('tag'),
                           allowed_leagues=allowed_leagues, now=fetched,
                           require_recent=require_recent):
        raise ValueError('not_approved_ranked')
    sides = sorted([b['team'][0], b['opponent'][0]], key=lambda p: p['tag'])
    if sides[0]['tag'] == sides[1]['tag']:
        raise ValueError('same_player')
    crowns = [p['crowns'] for p in sides]
    if any(type(c) is not int or not 0 <= c <= 3 for c in crowns):
        raise ValueError('invalid_crowns')
    if crowns[0] == crowns[1]:
        raise ValueError('tied_crowns')
    y = int(crowns[0] > crowns[1])
    # Labels may consult outcome fields, but those fields are never exported as inputs.
    changes = [p.get('trophyChange') for p in sides]
    missing_changes = any(not isinstance(v, (int, float)) for v in changes)
    if missing_changes and b['leagueNumber'] == 7:
        raise ValueError('missing_outcome_crosscheck')
    if not missing_changes and not ((changes[0] > 0 and changes[1] < 0) if y else (changes[0] < 0 and changes[1] > 0)):
        raise ValueError('conflicting_outcome')
    result = dict(match_id=bid, timestamp=int(datetime.strptime(b['battleTime'], '%Y%m%dT%H%M%S.%fZ').replace(tzinfo=timezone.utc).timestamp()),
                  league_number=int(b['leagueNumber']),
                  label=y, cards=[], forms=[], numeric=[], towers=[], tower_level=[], ratings=[], player_hash=[])
    for player in sides:
        # Forms travel with cards. Sorting creates deterministic representation without
        # assigning learned positional meaning to arbitrary deck order.
        cards = sorted(player['cards'], key=lambda c: c['id'])
        ids, forms, numeric = [], [], []
        for c in cards:
            form = c.get('evolutionLevel', 0)
            if type(form) is not int or form not in (0, 1, 2, 3):
                raise ValueError('unknown_form_code')
            cost = c.get('elixirCost')
            mirror = c['id'] == 28000006
            if cost is None and not mirror:
                raise ValueError('missing_elixir')
            if cost is not None and (not isinstance(cost, (int, float)) or not 0 <= cost <= 10):
                raise ValueError('invalid_elixir')
            ids.append(c['id']); forms.append(form)
            numeric.append([level(c)/16, (cost or 0)/10, float(cost is not None), float(mirror), float('evolutionLevel' in c)])
        towers = player.get('supportCards', [])
        if len(towers) != 1:
            raise ValueError('unsupported_tower_count')
        # Lower Ranked leagues omit rating. Zero is an explicit unavailable
        # context value; the deck-only network ignores rating altogether.
        rating = player.get('startingTrophies', 0 if b['leagueNumber'] in (5, 6) else None)
        if not isinstance(rating, (int, float)) or not 0 <= rating <= 10000:
            raise ValueError('invalid_starting_rating')
        result['cards'].append(ids); result['forms'].append(forms); result['numeric'].append(numeric)
        result['towers'].append(towers[0]['id']); result['tower_level'].append(level(towers[0])/16)
        result['ratings'].append(rating/4000)
        result['player_hash'].append(hashlib.sha256(player['tag'].encode()).hexdigest()[:32])
    return result


def split_rows(rows):
    rows.sort(key=lambda r: (r['timestamp'], r['match_id']))
    if len(rows) < 30:
        raise ValueError('Need at least 30 valid rows to build temporal splits')
    val_start = rows[int(len(rows)*0.8)]['timestamp']
    test_start = rows[int(len(rows)*0.9)]['timestamp']
    if val_start >= test_start:
        raise ValueError('Insufficient distinct timestamps for chronological splits')
    splits = {name: [] for name in ('train', 'validation', 'test')}
    for row in rows:
        name = 'train' if row['timestamp'] < val_start else ('validation' if row['timestamp'] < test_start else 'test')
        splits[name].append(row)
    if any(not v for v in splits.values()):
        raise ValueError('Empty temporal split')
    return splits, val_start, test_start


def vocab_for(rows, field):
    ids = set()
    for r in rows:
        for side in r[field]:
            ids.update(side if isinstance(side, list) else [side])
    return {str(raw): i+2 for i, raw in enumerate(sorted(ids))}


def arrays(rows, cards, towers, cutoff, half_life, training):
    features = {
        'card_ids': np.asarray([[[cards.get(str(c), 1) for c in side] for side in r['cards']] for r in rows], dtype=np.int64),
        'form_ids': np.asarray([r['forms'] for r in rows], dtype=np.int64),
        'card_numeric': np.asarray([r['numeric'] for r in rows], dtype=np.float32),
        'tower_ids': np.asarray([[towers.get(str(c), 1) for c in r['towers']] for r in rows], dtype=np.int64),
        'tower_level': np.asarray([r['tower_level'] for r in rows], dtype=np.float32),
        'starting_rating': np.asarray([r['ratings'] for r in rows], dtype=np.float32),
        'league_number': np.asarray([r['league_number'] for r in rows], dtype=np.int8),
        'label': np.asarray([r['label'] for r in rows], dtype=np.float32),
        'timestamp': np.asarray([r['timestamp'] for r in rows], dtype=np.int64),
        'match_id': np.asarray([r['match_id'] for r in rows], dtype='S64'),
        'player_hash': np.asarray([r['player_hash'] for r in rows], dtype='S32'),
    }
    age_days = np.maximum(0, cutoff-features['timestamp'])/86400
    features['weight'] = (2**(-age_days/half_life) if training else np.ones(len(rows))).astype(np.float32)
    return features


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--database', type=Path, default=ROOT/'data/ultimate-champion/battles.sqlite3')
    p.add_argument('--output-root', type=Path, default=ROOT/'data/training')
    p.add_argument('--half-life-days', type=float, default=14)
    p.add_argument('--allowed-leagues', default='7', help='Comma-separated Ranked leagues (5=Grand, 6=Royal, 7=Ultimate)')
    p.add_argument('--exclude-match-ids', type=Path, action='append', default=[],
                   help='NPZ export(s) whose match IDs must not enter this new experiment')
    p.add_argument('--include-older-games', action='store_true',
                   help='Accept valid records older than the collector 30-day window')
    args = p.parse_args()
    if args.half_life_days <= 0:
        p.error('Half-life must be positive')
    try:
        allowed_leagues = tuple(sorted({int(v.strip()) for v in args.allowed_leagues.split(',') if v.strip()}))
    except ValueError:
        p.error('--allowed-leagues must contain integers')
    if not allowed_leagues or any(v not in (5, 6, 7) for v in allowed_leagues):
        p.error('--allowed-leagues values must be 5, 6, or 7')
    excluded = set()
    for source in args.exclude_match_ids:
        with np.load(source, allow_pickle=False) as data:
            excluded.update(bytes(v) for v in data['match_id'].tolist())
    db = sqlite3.connect(args.database.resolve().as_uri()+'?mode=ro', uri=True)
    db.execute('BEGIN')
    raw_count = db.execute('SELECT COUNT(*) FROM battles').fetchone()[0]
    normalized, rejected = [], Counter()
    digest = hashlib.sha256()
    for bid, raw, fetched in db.execute('SELECT id,raw,fetched FROM battles ORDER BY id'):
        digest.update(bid.encode()); digest.update(raw)
        if bid.encode() in excluded:
            rejected['excluded_prior_test'] += 1
            continue
        try:
            normalized.append(normalize(json.loads(zlib.decompress(raw)), bid, fetched,
                                       allowed_leagues=allowed_leagues,
                                       require_recent=not args.include_older_games))
        except (ValueError, KeyError, TypeError, IndexError) as error:
            rejected[str(error)] += 1
    db.close()
    splits, val_start, test_start = split_rows(normalized)
    cards = vocab_for(splits['train'], 'cards')
    towers = vocab_for(splits['train'], 'towers')
    cutoff = max(r['timestamp'] for r in splits['train'])
    fingerprint = digest.hexdigest()
    out = args.output_root / (time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())+'-'+fingerprint[:8])
    out.mkdir(parents=True, exist_ok=False)
    manifest = {
        'schema_version': 2, 'source_database': str(args.database.resolve()), 'snapshot_raw_count': raw_count,
        'allowed_leagues': list(allowed_leagues),
        'excluded_prior_test_exports': [str(p.resolve()) for p in args.exclude_match_ids],
        'source_sha256': fingerprint, 'normalized_rows': len(normalized), 'rejections': dict(rejected),
        'train_cutoff_utc': datetime.fromtimestamp(cutoff, timezone.utc).isoformat(),
        'validation_start_utc': datetime.fromtimestamp(val_start, timezone.utc).isoformat(),
        'test_start_utc': datetime.fromtimestamp(test_start, timezone.utc).isoformat(),
        'half_life_days': args.half_life_days, 'card_numeric_features': NUMERIC_FEATURES,
        'vocabulary_source': 'training split only; 0 PAD, 1 UNK',
        'raw_form_codes': '0 absent/zero, 1/2/3 preserved categorical API values; no inferred Hero semantics',
        'label': 'Canonical side A wins by decisive crowns. UC additionally requires trophy-change signs; leagues 5/6 lack that API field, so crowns establish labels. Present conflicting changes are rejected.',
        'side_order': 'ascending source player tag; tags omitted, hashes audit-only',
        'input_exclusions': ['crowns','trophyChange','elixirLeaked','kingTowerHitPoints','princessTowersHitPoints','globalRank','player_hash','timestamp','match_id'],
        'level_offsets': OFFSETS, 'level_scale': 16, 'starting_rating_scale': 4000,
        'patch_policy': 'timestamps retained for external verified patch calendar; no fabricated patch IDs',
        'limitations': ['Observational player/deck selection bias', 'Shared players across temporal splits; player-disjoint evaluation still required',
                       'Equal-crown and conflicting outcomes excluded', 'Train/validation/test are chronological; calibration is carved from validation during training',
                       'Only normal Ranked 1v1 modes are included; metadata does not include full historical card stats',
                       'Player hashes are pseudonyms, not anonymization; do not pass them to the model'],
        'splits': {},
    }
    for name, rows in splits.items():
        data = arrays(rows, cards, towers, cutoff, args.half_life_days, name == 'train')
        path = out / (name+'.npz')
        np.savez_compressed(path, **data)
        weights = data['weight']
        manifest['splits'][name] = {'rows': len(rows), 'shapes': {k:list(v.shape) for k,v in data.items()},
            'unknown_cards': int((data['card_ids']==1).sum()), 'unknown_towers': int((data['tower_ids']==1).sum()),
            'league_counts': {str(v): int((data['league_number'] == v).sum()) for v in (5, 6, 7)},
            'side_a_win_fraction': float(data['label'].mean()), 'effective_weighted_n': float(weights.sum()**2/(weights**2).sum()),
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    (out/'vocabulary.json').write_text(json.dumps({'cards':cards, 'towers':towers}, indent=2), encoding='utf-8')
    (out/'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    from verify_export import verify
    verify(out)
    latest = args.output_root/'latest.tmp'
    latest.write_text(json.dumps({'directory':str(out.resolve()), 'rows':len(normalized)}), encoding='utf-8')
    latest.replace(args.output_root/'latest.json')
    print(json.dumps({'export':str(out), 'raw_games':raw_count, 'usable_games':len(normalized),
                      'rejected':dict(rejected), 'splits':{k:len(v) for k,v in splits.items()}}), flush=True)


if __name__ == '__main__':
    main()
