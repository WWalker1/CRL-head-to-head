"""Bounded parallel Ranked harvester with persistent breadth-first expansion.

This collector keeps the original ``ultimate-champion`` database for
backwards compatibility, but the harvest target is now a mixed high-skill
Ranked cohort (Grand, Royal, and Ultimate Champion).  Every inserted match is
still subject to the strict normal 1v1 filter below.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from collections import Counter
from datetime import datetime, timezone
import json
import os
import shutil
import time
from urllib.parse import quote
import zlib

from collect import ROOT, BASES, Client, connect, credential, identity
from collect_leaderboard import LEADERBOARD
from discovery import setup, add, discover_opponents
from mode_policy import RANKED_MODES, classify


COHORTS = {5: 'grand_champion_ranked', 6: 'royal_champion_ranked',
           7: 'ultimate_champion_ranked'}


def ranked_cohort(battle, source_tag, now=None, leagues=(5, 6, 7), max_age_days=30):
    """Return the high-skill Ranked cohort or ``None``.

    This intentionally fails closed when the API presents a new mode or
    modifier.  A player's leaderboard position is only a seed; the battle's
    own league field determines the label.
    """
    if not source_tag or source_tag not in [
            p.get('tag') for side in ('team', 'opponent') for p in battle.get(side, [])]:
        return None
    if not (classify(battle) in COHORTS.values() and
            battle.get('leagueNumber') in set(leagues) and
            battle.get('gameMode', {}).get('id') in RANKED_MODES):
        return None
    try:
        played = datetime.strptime(battle['battleTime'], '%Y%m%dT%H%M%S.%fZ').replace(
            tzinfo=timezone.utc).timestamp()
    except (KeyError, ValueError, TypeError):
        return None
    age = (time.time() if now is None else now) - played
    if age < 0 or age > max_age_days * 86400:
        return None
    return COHORTS[battle['leagueNumber']]


def store_log(db, tag, battles, fetched, leagues=(5, 6, 7), max_age_days=30):
    counts = dict(received=len(battles), accepted=0, duplicates=0, inserted=0, rejected=0)
    sources = db.execute('SELECT source,rank,observed FROM player_sources WHERE tag=?', (tag,)).fetchall()
    global_source = next((s for s in sources if s[0] == 'global_ranked'), None)
    parent_depth = db.execute('SELECT depth FROM uc_frontier WHERE tag=?', (tag,)).fetchone()
    parent_depth = parent_depth[0] if parent_depth else 0
    with db:
        for b in battles:
            bid = identity(b)
            cohort = ranked_cohort(b, tag, now=fetched, leagues=leagues, max_age_days=max_age_days)
            if not bid or cohort is None:
                counts['rejected'] += 1
                continue
            counts['accepted'] += 1
            new = db.execute('INSERT OR IGNORE INTO battles VALUES (?,?,?,?,?,?,?)',
                (bid, b['battleTime'], b['type'], json.dumps(b['gameMode']), 1,
                 fetched, zlib.compress(json.dumps(b).encode()))).rowcount
            counts['inserted'] += new
            counts['duplicates'] += 1-new
            db.execute('INSERT OR IGNORE INTO provenance VALUES (?,?,?,?)',
                (bid, tag, global_source[1] if global_source else None, global_source[2] if global_source else None))
            db.execute('INSERT OR IGNORE INTO discovery_provenance VALUES (?,?,?,?)',
                       (bid, tag, json.dumps(sources), fetched))
            db.execute('INSERT OR IGNORE INTO match_cohorts VALUES (?,?,?,?,?)',
                       (bid, cohort, tag, parent_depth, fetched))
            discover_opponents(db, b, parent_depth=parent_depth, source='verified_ranked_match')
        db.execute('UPDATE uc_frontier SET fetched=? WHERE tag=?', (fetched, tag))
        db.execute('INSERT INTO fetch_metrics VALUES (?,?,?,?,?,?,?)',
                   (tag, fetched, counts['received'], counts['accepted'], counts['duplicates'], counts['inserted'], counts['rejected']))
    return counts


def tables(db):
    setup(db)
    db.executescript('''
      CREATE TABLE IF NOT EXISTS provenance(battle_id TEXT PRIMARY KEY, source_tag TEXT, source_rank INTEGER, snapshot_time REAL);
      CREATE TABLE IF NOT EXISTS discovery_provenance(battle_id TEXT PRIMARY KEY, source_tag TEXT, sources_json TEXT, fetched REAL);
      CREATE TABLE IF NOT EXISTS fetch_metrics(tag TEXT, fetched REAL, received INTEGER, accepted INTEGER,
                                              duplicates INTEGER, inserted INTEGER, rejected INTEGER);
      CREATE INDEX IF NOT EXISTS fetch_metrics_time ON fetch_metrics(fetched);
      CREATE TABLE IF NOT EXISTS match_cohorts(
        battle_id TEXT PRIMARY KEY, cohort TEXT NOT NULL, source_tag TEXT,
        source_depth INTEGER NOT NULL, accepted_at REAL NOT NULL);
      CREATE INDEX IF NOT EXISTS match_cohorts_cohort ON match_cohorts(cohort);
    ''')


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--target', type=int, default=500000,
                   help='Total unique accepted Ranked matches, including existing rows')
    p.add_argument('--leagues', default='5,6,7',
                   help='Comma-separated Path of Legend leagues (5=Grand, 6=Royal, 7=Ultimate)')
    p.add_argument('--max-age-days', type=int, default=30)
    p.add_argument('--rps', type=float, default=12)
    p.add_argument('--workers', type=int, default=12)
    p.add_argument('--max-hours', type=float, default=12)
    p.add_argument('--max-requests', type=int, default=200000)
    args = p.parse_args()
    if args.target <= 0 or args.max_age_days <= 0 or args.rps <= 0 or args.workers <= 0 \
            or args.max_hours <= 0 or args.max_requests <= 0 or args.workers > 32 or args.rps > 20:
        p.error('Positive limits required; maximum 32 workers and 20 requests/sec')
    try:
        leagues = tuple(sorted({int(value) for value in args.leagues.split(',')}))
    except ValueError:
        p.error('--leagues must be comma-separated integers')
    if not leagues or any(league not in COHORTS for league in leagues):
        p.error('--leagues must contain only 5, 6, or 7')
    folder = ROOT / 'data/ultimate-champion'
    client = Client(credential(ROOT.parent / '.env'), BASES['direct'], args.rps)
    lock = folder / 'collector.lock'
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    os.write(fd, str(os.getpid()).encode()); os.close(fd)
    db = None
    started = time.time()
    state = 'starting'
    totals = dict(received=0, accepted=0, duplicates=0, inserted=0, rejected=0,
                  fetched_players=0, failed_logs=0)
    exclusions = Counter()
    try:
        db = connect(folder / 'battles.sqlite3')
        tables(db)
        initial = db.execute('SELECT COUNT(*) FROM battles').fetchone()[0]
        count = initial
        # Refresh the global top-1000 roots.  The existing regional roots and
        # accepted-match opponents remain in the persistent BFS frontier.
        snapshot = client.get(LEADERBOARD)
        if not isinstance(snapshot, dict) or not isinstance(snapshot.get('items'), list):
            raise RuntimeError('Unexpected leaderboard schema; stopped before harvesting')
        with db:
            for player in snapshot['items']:
                add(db, player.get('tag'), 'global_ranked', player.get('rank'), depth=0)

        # Backfill cohort provenance for the frozen UC rows.  This is a local
        # metadata migration; raw matches and their identities are untouched.
        missing = db.execute('SELECT COUNT(*) FROM battles b LEFT JOIN match_cohorts c ON c.battle_id=b.id WHERE c.battle_id IS NULL').fetchone()[0]
        if missing:
            with db:
                for bid, raw in db.execute('SELECT b.id,b.raw FROM battles b LEFT JOIN match_cohorts c ON c.battle_id=b.id WHERE c.battle_id IS NULL').fetchall():
                    battle = json.loads(zlib.decompress(raw))
                    cohort = ranked_cohort(battle, battle.get('team', [{}])[0].get('tag'),
                                           now=time.time(), leagues=leagues, max_age_days=args.max_age_days)
                    # Existing rows were collected as verified UC.  Preserve
                    # provenance even when they age outside the current window.
                    if cohort is None and battle.get('leagueNumber') == 7:
                        cohort = COHORTS[7]
                    if cohort:
                        db.execute('INSERT OR IGNORE INTO match_cohorts VALUES (?,?,?,?,?)',
                                   (bid, cohort, None, 0, time.time()))

        def status():
            pool, pending = db.execute('SELECT COUNT(*),SUM(fetched IS NULL) FROM uc_frontier').fetchone()
            cohort_counts = dict(db.execute('SELECT cohort,COUNT(*) FROM match_cohorts GROUP BY cohort').fetchall())
            max_depth = db.execute('SELECT COALESCE(MAX(depth),0) FROM uc_frontier').fetchone()[0]
            report = dict(totals, state=state, pid=os.getpid(), updated_at=time.time(),
                          elapsed_seconds=round(time.time()-started), requests=client.requests,
                          initial_matches=initial, unique_ranked_matches=count, target=args.target,
                          leagues=list(leagues), cohorts=cohort_counts,
                          max_frontier_depth=max_depth,
                          candidate_players=pool, unfetched_players=pending,
                          new_per_successful_log=round(totals['inserted']/max(1, totals['fetched_players']), 3),
                          rejected_types=dict(exclusions),
                          filter='normal Path of Legend Ranked 1v1, league 5/6/7, collection deck, age <= configured window')
            temp = folder / 'status.tmp'
            temp.write_text(json.dumps(report, indent=2), encoding='utf-8')
            temp.replace(folder / 'status.json')
            print(json.dumps(report), flush=True)

        def fetch(tag):
            try:
                result = client.get('/players/' + quote(tag, safe='') + '/battlelog')
                if result is None:
                    return tag, [], None
                if not isinstance(result, list):
                    return tag, None, 'Unexpected log schema'
                return tag, result, None
            except SystemExit as error:
                message = str(error)
                if '401' in message or '403' in message:
                    raise
                return tag, None, message

        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            while count < args.target and time.time()-started < args.max_hours*3600 and client.requests < args.max_requests:
                if (folder / 'STOP').exists():
                    break
                if shutil.disk_usage(folder).free < 2*1024**3:
                    raise RuntimeError('Insufficient free disk')
                # Unfetched players first; deterministic spread avoids country insertion order bias.
                # NULL first, then increasing BFS depth and discovery order.
                # Refetches are allowed only after the frontier is exhausted
                # for 30 minutes, which keeps discovery breadth-first.
                tags = [r[0] for r in db.execute('''SELECT tag FROM uc_frontier
                    WHERE fetched IS NULL OR fetched<?
                    ORDER BY (fetched IS NOT NULL), depth, discovery_order, tag LIMIT 120''',
                    (time.time()-1800,))]
                if not tags:
                    state = 'waiting'; status(); time.sleep(30); continue
                state = 'collecting'
                for tag, battles, error in executor.map(fetch, tags):
                    if error:
                        totals['failed_logs'] += 1
                        if totals['failed_logs'] >= 20:
                            raise RuntimeError('20 failed logs; stopping for network/schema review')
                        continue
                    fetched_at = time.time()
                    result = store_log(db, tag, battles, fetched_at, leagues=leagues,
                                       max_age_days=args.max_age_days)
                    for key, value in result.items():
                        totals[key] += value
                    totals['fetched_players'] += 1
                    count += result['inserted']
                status()
            state = 'stopped'; status()
    except BaseException:
        state = 'failed'
        if 'status' in locals():
            status()
        raise
    finally:
        if db:
            db.close()
        lock.unlink(missing_ok=True)


if __name__ == '__main__':
    main()
