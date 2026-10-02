"""Export a relocatable CPU inference bundle from the frozen selected run."""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

def export(source: Path, destination: Path) -> dict:
    source = source.resolve(); destination.mkdir(parents=True, exist_ok=True)
    ckpt = source / "attention.pt"
    meta = source / "metrics.json"
    checkpoint = __import__('torch').load(ckpt, map_location='cpu', weights_only=True)
    dataset = Path(checkpoint['dataset'])
    if not dataset.is_absolute(): dataset = (source.parents[3] / dataset).resolve()
    # Keep runtime artifacts small and independent of the training archive.
    files = {'attention.pt': ckpt, 'card-catalog.json': dataset/'card-catalog.json',
             'examples.json': dataset/'examples.json', 'search-seeds.json': dataset/'search-seeds.json',
             'metrics.json': meta}
    for name, path in files.items():
        if not path.exists():
            if name == 'search-seeds.json': continue
            raise FileNotFoundError(path)
        if name == 'attention.pt':
            portable = {key: checkpoint[key] for key in ('state_dict', 'cards', 'towers', 'temperature', 'layers') if key in checkpoint}
            __import__('torch').save(portable, destination/name)
        elif name == 'metrics.json':
            metrics = json.loads(path.read_text())
            # Runtime does not need local training paths or optimizer metadata.
            (destination/name).write_bytes(json.dumps({'models': metrics.get('models', {})}).encode('utf-8'))
        else:
            # Git stores these JSON artifacts with LF endings on every platform.
            # Hash the same bytes that a Linux deployment will receive.
            (destination/name).write_bytes(path.read_bytes().replace(b'\r\n', b'\n'))
    manifest = {'schema_version': 1, 'model_id': source.name, 'training_cutoff': None,
                'architecture': 'MatchupAttention', 'temperature': float(checkpoint['temperature']),
                'rules_version': '2026-03-deck-slots',
                'rules_source': 'https://supercell.com/en/games/clashroyale/blog/news/mid-march-update/',
                'supported_rules': {'evolutions_max': 2, 'heroes_or_champions_max': 2, 'special_slots_max': 3},
                'files': {name: hashlib.sha256((destination/name).read_bytes()).hexdigest() for name in files if (destination/name).exists()}}
    if (dataset/'manifest.json').exists():
        try:
            source_manifest=json.loads((dataset/'manifest.json').read_text())
            manifest['training_cutoff'] = source_manifest.get('train_cutoff_utc')
            manifest['training_schema_version'] = source_manifest.get('schema_version')
        except Exception: pass
    (destination/'bundle.json').write_bytes((json.dumps(manifest, indent=2) + '\n').encode('utf-8'))
    return manifest

if __name__ == '__main__':
    p=argparse.ArgumentParser(); p.add_argument('--source',type=Path,required=True); p.add_argument('--destination',type=Path,required=True)
    args=p.parse_args(); print(json.dumps(export(args.source, args.destination), indent=2))
