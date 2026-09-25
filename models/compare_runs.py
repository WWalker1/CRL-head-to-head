"""Compare frozen attention checkpoints on one uncontaminated future holdout.

This script never trains or writes into a source export.  The new test rows are
filtered to timestamps strictly after the old test window and to match IDs that
were absent from every old train/validation/test artifact.  The old model is
fed the same raw cards after mapping cards/towers absent from its training
vocabulary to UNK (1); forms and numeric features are copied unchanged.
"""
import argparse
from datetime import datetime, timezone
import copy
import json
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader, Dataset, Subset

from attention_data import MatchupAttention
from collect import ROOT
from train import metrics


DEFAULT_OLD_DATA = ROOT / 'data/training/20260921T044709Z-653d169c'
DEFAULT_OLD_RUN = ROOT / 'data/runs/20260921T163430Z'


class ArrayDataset(Dataset):
    """Minimal inference dataset; labels remain available for evaluation."""
    KEYS = ('card_ids', 'form_ids', 'card_numeric', 'tower_ids',
            'tower_level', 'starting_rating', 'label', 'weight')

    def __init__(self, arrays):
        self.data = {key: torch.from_numpy(np.asarray(arrays[key]).copy())
                     for key in self.KEYS}

    def __len__(self):
        return len(self.data['label'])

    def __getitem__(self, index):
        return {key: value[index] for key, value in self.data.items()}


def read_vocab(directory):
    return json.loads((directory / 'vocabulary.json').read_text(encoding='utf-8'))


def invert(vocab, key):
    return {int(index): raw for raw, index in vocab[key].items()}


def remap_indices(values, new_vocab, old_vocab, key):
    """Translate indexes through raw API IDs, mapping missing raw IDs to UNK."""
    new_inverse = invert(new_vocab, key)
    old_forward = old_vocab[key]
    out = np.ones_like(values, dtype=np.int64)
    for new_index in np.unique(values):
        raw = new_inverse.get(int(new_index))
        if raw is not None:
            out[values == new_index] = int(old_forward.get(raw, 1))
    return out


def load_arrays(directory):
    with np.load(directory / 'test.npz', allow_pickle=False) as data:
        return {key: data[key].copy() for key in data.files}


def load_model(run, name, cards, towers):
    payload = torch.load(run / (name + '.pt'), map_location='cpu', weights_only=True)
    model = MatchupAttention(cards, towers, layers=payload.get('layers',2))
    model.load_state_dict(payload['state_dict'])
    model.eval()
    return model, float(payload.get('temperature', 1.0))


def predict(model, arrays, batch_size=512):
    loader = DataLoader(ArrayDataset(arrays), batch_size=batch_size, shuffle=False)
    outputs = []
    labels = []
    with torch.no_grad():
        for batch in loader:
            outputs.append(model(batch).numpy())
            labels.append(batch['label'].numpy())
    return np.concatenate(outputs), np.concatenate(labels)


def paired_bootstrap(logits_a, logits_b, labels, temperatures, seed=42, rounds=1000):
    """Paired row bootstrap for metric differences (new minus old).

    Resampling rows preserves the pairing between predictions.  The optional
    player-cluster interval below is deliberately labelled approximate because
    each physical match has two players and the player graph overlaps.
    """
    rng = np.random.default_rng(seed)
    n = len(labels)
    acc = []
    loss = []
    for _ in range(rounds):
        sample = rng.integers(0, n, n)
        ma = metrics(logits_a[sample], labels[sample], temperatures[0])
        mb = metrics(logits_b[sample], labels[sample], temperatures[1])
        acc.append(mb['accuracy'] - ma['accuracy'])
        loss.append(mb['log_loss'] - ma['log_loss'])
    return {
        'accuracy_new_minus_old': {
            'mean': float(np.mean(acc)),
            'ci95': [float(v) for v in np.quantile(acc, [.025, .975])],
        },
        'log_loss_new_minus_old': {
            'mean': float(np.mean(loss)),
            'ci95': [float(v) for v in np.quantile(loss, [.025, .975])],
        },
        'method': 'paired row bootstrap; same physical matches in each replicate',
        'rounds': rounds,
    }


def player_cluster_bootstrap(logits_a, logits_b, labels, temperatures,
                             player_hash, seed=42, rounds=500):
    """Approximate side-A-player cluster bootstrap, explicitly caveated."""
    players = np.unique(player_hash[:, 0])
    groups = [np.flatnonzero(player_hash[:, 0] == player) for player in players]
    rng = np.random.default_rng(seed)
    acc = []
    loss = []
    for _ in range(rounds):
        selected = rng.integers(0, len(groups), len(groups))
        sample = np.concatenate([groups[index] for index in selected])
        ma = metrics(logits_a[sample], labels[sample], temperatures[0])
        mb = metrics(logits_b[sample], labels[sample], temperatures[1])
        acc.append(mb['accuracy'] - ma['accuracy'])
        loss.append(mb['log_loss'] - ma['log_loss'])
    return {
        'accuracy_new_minus_old_ci95': [float(v) for v in np.quantile(acc, [.025, .975])],
        'log_loss_new_minus_old_ci95': [float(v) for v in np.quantile(loss, [.025, .975])],
        'method': 'approximate side-A-player cluster bootstrap; overlapping player pairs are not fully de-correlated',
        'rounds': rounds,
        'players': int(len(players)),
    }


def evaluate_slice(logits_old, logits_new, labels, mask, temps, hashes):
    if not np.any(mask):
        return None
    old = metrics(logits_old[mask], labels[mask], temps[0])
    new = metrics(logits_new[mask], labels[mask], temps[1])
    old_ids = logits_old[mask]
    new_ids = logits_new[mask]
    y = labels[mask]
    paired = paired_bootstrap(old_ids, new_ids, y, temps)
    clustered = player_cluster_bootstrap(old_ids, new_ids, y, temps, hashes[mask])
    return {
        'rows': int(mask.sum()),
        'old_attention': old,
        'new_attention': new,
        'difference_new_minus_old': paired,
        'approx_player_cluster_difference': clustered,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--old-directory', type=Path, default=DEFAULT_OLD_DATA)
    parser.add_argument('--old-run', type=Path, default=DEFAULT_OLD_RUN)
    parser.add_argument('--new-directory', type=Path, required=True)
    parser.add_argument('--new-run', type=Path, required=True)
    parser.add_argument('--bootstrap-rounds', type=int, default=1000)
    args = parser.parse_args()
    if args.bootstrap_rounds < 100:
        parser.error('--bootstrap-rounds must be at least 100')
    torch.set_num_threads(2)

    old_manifest = json.loads((args.old_directory / 'manifest.json').read_text(encoding='utf-8'))
    new_manifest = json.loads((args.new_directory / 'manifest.json').read_text(encoding='utf-8'))
    old_vocab = read_vocab(args.old_directory)
    new_vocab = read_vocab(args.new_directory)
    old_test = load_arrays(args.old_directory)
    new_test = load_arrays(args.new_directory)

    old_ids = set()
    for split in ('train', 'validation', 'test'):
        with np.load(args.old_directory / (split + '.npz'), allow_pickle=False) as data:
            old_ids.update(bytes(value) for value in data['match_id'].tolist())
    old_test_max = int(old_test['timestamp'].max())
    ids = np.asarray([bytes(value) for value in new_test['match_id'].tolist()], dtype=object)
    future = new_test['timestamp'] > old_test_max
    unseen = np.asarray([value not in old_ids for value in ids], dtype=bool)
    holdout_mask = future & unseen
    if not np.any(holdout_mask):
        raise RuntimeError('No new test rows are both after the old test window and absent from all old splits')

    # Keep only the strict future holdout, retaining metadata for slices.
    eval_arrays = {key: value[holdout_mask] for key, value in new_test.items()}
    old_arrays = copy.deepcopy(eval_arrays)
    old_arrays['card_ids'] = remap_indices(eval_arrays['card_ids'], new_vocab, old_vocab, 'cards')
    old_arrays['tower_ids'] = remap_indices(eval_arrays['tower_ids'], new_vocab, old_vocab, 'towers')

    old_model, old_temperature = load_model(args.old_run, 'attention', len(old_vocab['cards']) + 2, len(old_vocab['towers']) + 2)
    new_model, new_temperature = load_model(args.new_run, 'attention', len(new_vocab['cards']) + 2, len(new_vocab['towers']) + 2)
    old_logits, labels = predict(old_model, old_arrays)
    new_logits, new_labels = predict(new_model, eval_arrays)
    if not np.array_equal(labels, new_labels):
        raise AssertionError('old/new evaluation labels are not aligned')
    hashes = eval_arrays['player_hash']
    leagues = eval_arrays.get('league_number', np.full(len(labels), 7, dtype=np.int8))
    temps = (old_temperature, new_temperature)

    report = {
        'old_dataset': str(args.old_directory.resolve()),
        'new_dataset': str(args.new_directory.resolve()),
        'old_run': str(args.old_run.resolve()),
        'new_run': str(args.new_run.resolve()),
        'old_source_sha256': old_manifest['source_sha256'],
        'new_source_sha256': new_manifest['source_sha256'],
        'holdout_policy': 'new test rows with timestamp strictly after old test max and match IDs absent from old train/validation/test',
        'old_test_max_utc': datetime.fromtimestamp(old_test_max, timezone.utc).isoformat(),
        'old_test_max_timestamp': old_test_max,
        'new_test_rows_before_filter': int(len(new_test['label'])),
        'excluded_old_id_rows': int((~unseen).sum()),
        'excluded_not_future_rows': int((~future).sum()),
        'rows': int(len(labels)),
        'temperatures': {'old': old_temperature, 'new': new_temperature},
        'slices': {},
        'limitations': [
            'This is a deck-only observational comparison; it does not establish causal counter-deck strength.',
            'The old checkpoint receives new cards/towers as UNK, so mixed-cohort results measure deployment under vocabulary shift.',
            'Player-cluster intervals are approximate and should not be treated as independent-player confidence bounds.',
            'The old model was trained only on Ultimate Champion; its all-cohort score is out of distribution.',
        ],
    }
    report['slices']['all_supported_ranked'] = evaluate_slice(
        old_logits, new_logits, labels, np.ones(len(labels), dtype=bool), temps, hashes)
    report['slices']['ultimate_champion'] = evaluate_slice(
        old_logits, new_logits, labels, leagues == 7, temps, hashes)
    for league in (5, 6):
        report['slices'][f'league_{league}'] = evaluate_slice(
            old_logits, new_logits, labels, leagues == league, temps, hashes)

    print(json.dumps(report, indent=2), flush=True)


if __name__ == '__main__':
    main()
