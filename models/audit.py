"""Read-only bounded schema audit. Keeps player tags and names out of reports."""
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path
import sqlite3
import zlib

ROOT = Path(__file__).resolve().parent


def main():
    db = sqlite3.connect((ROOT / 'data/battles.sqlite3').as_uri() + '?mode=ro', uri=True)
    fields = {name: set() for name in ('battle', 'player', 'card', 'support_card')}
    modes, forms, selections = Counter(), Counter(), Counter()
    matches = regular = tied = support = modifiers = 0
    dates = []
    for (raw,) in db.execute('SELECT raw FROM battles LIMIT 10000'):
        b = json.loads(zlib.decompress(raw))
        matches += 1
        dates.append(b['battleTime'])
        fields['battle'].update(b)
        mode = b.get('gameMode', {})
        modes[(b.get('type'), mode.get('id'), mode.get('name'))] += 1
        selections[b.get('deckSelection')] += 1
        sides = b.get('team', []) + b.get('opponent', [])
        modifiers += bool(b.get('modifiers'))
        if len(b.get('team', [])) == len(b.get('opponent', [])) == 1:
            tied += sides[0].get('crowns') == sides[1].get('crowns')
            if (b.get('type'), mode.get('id')) in {
                ('PvP', 72000006), ('pathOfLegend', 72000464), ('pathOfLegend', 72000450)
            } and b.get('deckSelection') == 'collection' and not b.get('modifiers'):
                regular += 1
        for p in sides:
            fields['player'].update(p)
            support += bool(p.get('supportCards'))
            for c in p.get('cards', []):
                fields['card'].update(c)
                forms[str(c.get('evolutionLevel', 'absent'))] += 1
            for c in p.get('supportCards', []):
                fields['support_card'].update(c)
    report = {
        'generated_utc': datetime.now(timezone.utc).isoformat(),
        'total_unique_and_structural': db.execute('SELECT COUNT(*), SUM(candidate) FROM battles').fetchone(),
        'sample_size': matches, 'sample_limit': 10000,
        'fields': {k: sorted(v) for k, v in fields.items()},
        'modes': [{'type': k[0], 'id': k[1], 'name': k[2], 'count': v} for k, v in modes.most_common()],
        'deck_selection': dict(selections), 'evolution_level': dict(forms),
        'preliminary_regular_mode_matches': regular, 'tied_crowns_1v1': tied,
        'players_with_support_cards': support, 'matches_with_modifiers': modifiers,
        'sample_date_range': [min(dates), max(dates)] if dates else [],
        'average_compressed_bytes_sample': db.execute('SELECT AVG(length(raw)) FROM (SELECT raw FROM battles LIMIT 10000)').fetchone()[0],
        'notes': ['Regular-mode count is preliminary, not a finalized training set.',
                  'evolutionLevel values are preserved; Hero/form semantics need further validation.',
                  'Rows without evolutionLevel must not be assumed to have missing card identity.']}
    (ROOT / 'data/audit.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
    db.close()


if __name__ == '__main__':
    main()
