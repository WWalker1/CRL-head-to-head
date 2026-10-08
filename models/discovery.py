"""Persistent candidate player pool with breadth-first opponent expansion.

The frontier is deliberately stored in SQLite so a long harvest can stop and
resume without losing the order in which players were discovered.  A player
being in this table is only a collection candidate; the battle filter remains
the source of truth for cohort membership.
"""
import json
import time
from collect import ROOT, BASES, Client, connect, credential


def setup(db):
    db.executescript('''
      CREATE TABLE IF NOT EXISTS uc_frontier(
        tag TEXT PRIMARY KEY, fetched REAL, depth INTEGER NOT NULL DEFAULT 0,
        discovery_order INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX IF NOT EXISTS uc_frontier_fetched ON uc_frontier(fetched);
      CREATE INDEX IF NOT EXISTS uc_frontier_discovery_order ON uc_frontier(discovery_order);
      CREATE TABLE IF NOT EXISTS player_sources(
        tag TEXT, source TEXT, rank INTEGER, observed REAL,
        PRIMARY KEY(tag,source));
    ''')

    # The first collector used a two-column frontier.  Upgrade it in place so
    # its 29k candidates remain usable and existing runs stay resumable.
    columns = {row[1] for row in db.execute('PRAGMA table_info(uc_frontier)')}
    if 'depth' not in columns:
        db.execute('ALTER TABLE uc_frontier ADD COLUMN depth INTEGER NOT NULL DEFAULT 0')
    if 'discovery_order' not in columns:
        db.execute('ALTER TABLE uc_frontier ADD COLUMN discovery_order INTEGER NOT NULL DEFAULT 0')
    db.execute('''UPDATE uc_frontier SET discovery_order=rowid
                  WHERE discovery_order=0''')
    # Global/regional leaderboard candidates are BFS roots.  Candidates
    # discovered from a previously accepted match start at depth one.
    db.execute('''UPDATE uc_frontier SET depth=0
                  WHERE EXISTS (SELECT 1 FROM player_sources s
                                WHERE s.tag=uc_frontier.tag
                                AND (s.source='global_ranked' OR s.source LIKE 'regional_ranked:%'))''')
    db.execute('''UPDATE uc_frontier SET depth=1
                  WHERE depth=0 AND EXISTS (SELECT 1 FROM player_sources s
                                            WHERE s.tag=uc_frontier.tag
                                            AND s.source='verified_uc_match')
                    AND NOT EXISTS (SELECT 1 FROM player_sources s
                                    WHERE s.tag=uc_frontier.tag
                                    AND (s.source='global_ranked' OR s.source LIKE 'regional_ranked:%'))''')


def add(db, tag, source, rank=None, observed=None, depth=None):
    if not isinstance(tag, str) or not tag.startswith('#'):
        return
    if depth is None:
        depth = 0 if source == 'global_ranked' or source.startswith('regional_ranked:') else 1
    # Most opponent observations are repeats.  Avoid the sequence allocation
    # query entirely for an existing tag; this is the hot path in a large
    # harvest.  New tags use the indexed MAX lookup, which preserves the
    # durable insertion order across collector restarts.
    existing = db.execute('SELECT depth FROM uc_frontier WHERE tag=?', (tag,)).fetchone()
    if existing is None:
        next_order = db.execute('SELECT COALESCE(MAX(discovery_order),0)+1 FROM uc_frontier').fetchone()[0]
        db.execute('''INSERT INTO uc_frontier(tag,fetched,depth,discovery_order)
                      VALUES (?,NULL,?,?)''', (tag, max(0, int(depth)), next_order))
    # If an existing player is reached by a shorter path, retain that path.
    db.execute('UPDATE uc_frontier SET depth=MIN(depth,?) WHERE tag=?', (max(0, int(depth)), tag))
    db.execute('INSERT OR REPLACE INTO player_sources VALUES (?,?,?,?)',
               (tag, source, rank, time.time() if observed is None else observed))


def discover_opponents(db, battle, parent_depth=0, source='verified_uc_match'):
    """Add both participants as the next BFS layer.

    Callers must first verify the match with the strict ranked filter.  The
    source label makes it possible to audit whether a player came from a
    leaderboard seed or from an accepted match.
    """
    for side in ('team', 'opponent'):
        for player in battle[side]:
            add(db, player['tag'], source, observed=time.time(), depth=parent_depth + 1)


def main():
    folder = ROOT / 'data/ultimate-champion'
    db = connect(folder / 'battles.sqlite3')
    setup(db)
    client = Client(credential(ROOT.parent / '.env'), BASES['direct'], 2)
    locations = client.get('/locations')
    countries = [x for x in locations['items'] if x.get('isCountry')]
    report = []
    before = db.execute('SELECT COUNT(*) FROM uc_frontier').fetchone()[0]
    for loc in countries:
        if (folder / 'STOP').exists():
            break
        result = client.get(f"/locations/{loc['id']}/pathoflegend/players?limit=1000")
        if result is None:
            continue
        rows = result.get('items', [])
        observed = time.time()
        with db:
            for p in rows:
                add(db, p.get('tag'), 'regional_ranked:' + str(loc['id']), p.get('rank'), observed)
        report.append({'location': loc['name'], 'id': loc['id'], 'players': len(rows)})
        if len(report) % 10 == 0:
            print(json.dumps({'countries': len(report), 'unique_candidates': db.execute('SELECT COUNT(*) FROM uc_frontier').fetchone()[0]}), flush=True)
    summary = {'countries': report, 'unique_candidates': db.execute('SELECT COUNT(*) FROM uc_frontier').fetchone()[0],
               'pool_before': before, 'updated': time.time(), 'note': 'Candidates only; battle filter establishes UC eligibility.'}
    (folder / 'discovery.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    print(json.dumps({k:v for k,v in summary.items() if k != 'countries'}), flush=True)
    db.close()


if __name__ == '__main__':
    main()
