"""Collect UC games using global/regional Ranked seeds and verified UC opponents."""
import argparse
from collections import Counter
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import time
from urllib.parse import quote
import zlib

from collect import BASES, ROOT, Client, candidate, connect, credential, identity
from discovery import setup, add, discover_opponents

LEADERBOARD = '/locations/global/pathoflegend/players?limit=1000'


def accepted(b, source_tag, now=None):
    # League 7 verified against the current leaderboard leader's profile and log.
    # Fail closed on new modes/rules; do not infer UC from a player's lifetime best.
    if not (candidate(b) and b.get('type') == 'pathOfLegend'
            and b.get('leagueNumber') == 7
            and b.get('gameMode', {}).get('id') == 72000464
            and b.get('deckSelection') == 'collection'
            and not b.get('modifiers') and not b.get('isHostedMatch')
            and not b.get('isLadderTournament')):
        return False
    if source_tag not in [p.get('tag') for s in ('team', 'opponent') for p in b[s]]:
        return False
    try:
        played = datetime.strptime(b['battleTime'], '%Y%m%dT%H%M%S.%fZ').replace(tzinfo=timezone.utc).timestamp()
    except (KeyError, ValueError, TypeError):
        return False
    age = (time.time() if now is None else now) - played
    return 0 <= age <= 30 * 86400


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--max-hours', type=float, default=48)
    parser.add_argument('--max-requests', type=int, default=500000)
    parser.add_argument('--target', type=int, default=3000000)
    parser.add_argument('--poll-minutes', type=float, default=30)
    args = parser.parse_args()
    if min(vars(args).values()) <= 0:
        parser.error('All limits must be positive')
    folder = ROOT / 'data/ultimate-champion'
    folder.mkdir(parents=True, exist_ok=True)
    # Atomic lock prevents simultaneous collectors on this dataset.
    lock = folder / 'collector.lock'
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    os.write(fd, str(os.getpid()).encode())
    os.close(fd)
    db = None
    state = 'starting'
    started = time.time()
    received = rejected = requests = 0
    exclusions = Counter()
    client = Client(credential(ROOT.parent / '.env'), BASES['direct'], 2)
    try:
        db = connect(folder / 'battles.sqlite3')
        setup(db)
        db.execute('CREATE TABLE IF NOT EXISTS provenance(battle_id TEXT PRIMARY KEY, source_tag TEXT, source_rank INTEGER, snapshot_time REAL)')
        db.execute('CREATE TABLE IF NOT EXISTS discovery_provenance(battle_id TEXT PRIMARY KEY, source_tag TEXT, sources_json TEXT, fetched REAL)')
        # Bootstrap previously saved UC participants without importing mixed-mode data.
        with db:
            for (raw,) in db.execute('SELECT raw FROM battles').fetchall():
                b = json.loads(zlib.decompress(raw))
                if accepted(b, b['team'][0]['tag']):
                    discover_opponents(db, b)
        count = db.execute('SELECT COUNT(*) FROM battles').fetchone()[0]

        def status():
            report = {'pid': os.getpid(), 'state': state, 'updated_at': time.time(),
                      'elapsed_seconds': round(time.time()-started), 'requests': client.requests,
                      'received_this_run': received, 'rejected_this_run': rejected,
                      'unique_uc_matches': count, 'target': args.target,
                      'next_milestone': 300000, 'milestone_progress_percent': round(count / 300000 * 100, 2),
                      'target_reached': count >= args.target, 'source': 'regional/global Ranked and verified UC opponents',
                      'candidate_players': db.execute('SELECT COUNT(*) FROM uc_frontier').fetchone()[0],
                      'unfetched_players': db.execute('SELECT COUNT(*) FROM uc_frontier WHERE fetched IS NULL').fetchone()[0],
                      'filter': 'Ranked 1v1, league 7, mode 72000464, collection deck, age <=30 days',
                      'rejected_types': dict(exclusions)}
            temp = folder / 'status.tmp'
            temp.write_text(json.dumps(report, indent=2), encoding='utf-8')
            temp.replace(folder / 'status.json')
            print(json.dumps(report), flush=True)

        def running():
            return (count < args.target and client.requests < args.max_requests
                    and time.time()-started < args.max_hours*3600
                    and not (folder / 'STOP').exists())

        catalog = client.get('/cards')
        (folder / f'cards-{int(started)}.json').write_text(json.dumps(catalog), encoding='utf-8')
        while running():
            cycle = time.time()
            snapshot = client.get(LEADERBOARD)
            players = snapshot.get('items', []) if isinstance(snapshot, dict) else []
            if not players or any(not p.get('tag') or not isinstance(p.get('rank'), int)
                                  or not 1 <= p['rank'] <= 1000 for p in players):
                raise RuntimeError('Unexpected leaderboard schema; stopped')
            leader = client.get('/players/' + quote(players[0]['tag'], safe=''))
            if not leader or leader.get('currentPathOfLegendSeasonResult', {}).get('leagueNumber') != 7:
                raise RuntimeError('Current leaderboard no longer confirms league 7; review UC filter')
            (folder / f'leaderboard-{int(cycle)}.json').write_text(json.dumps(snapshot), encoding='utf-8')
            with db:
                for player in players:
                    add(db, player['tag'], 'global_ranked', player['rank'], cycle)
            players = [{'tag': r[0]} for r in db.execute(
                'SELECT tag FROM uc_frontier WHERE fetched IS NULL OR fetched<? ORDER BY fetched LIMIT 1000',
                (time.time() - args.poll_minutes*60,))]
            state = 'collecting'
            status()
            for player in players:
                if not running():
                    break
                if shutil.disk_usage(folder).free < 2 * 1024**3:
                    raise RuntimeError('Less than 2 GiB free disk')
                tag = player['tag']
                battles = client.get('/players/' + quote(tag, safe='') + '/battlelog')
                if battles is None:
                    with db:
                        db.execute('UPDATE uc_frontier SET fetched=? WHERE tag=?', (time.time(), tag))
                    continue
                if not isinstance(battles, list):
                    raise RuntimeError('Unexpected battle-log schema')
                received += len(battles)
                with db:
                    for b in battles:
                        if not accepted(b, tag):
                            rejected += 1
                            exclusions[b.get('type', 'missing')] += 1
                            continue
                        bid = identity(b)
                        if not bid:
                            rejected += 1
                            continue
                        cursor = db.execute('INSERT OR IGNORE INTO battles VALUES (?,?,?,?,?,?,?)',
                            (bid, b['battleTime'], b['type'], json.dumps(b['gameMode']), 1,
                             time.time(), zlib.compress(json.dumps(b).encode())))
                        count += cursor.rowcount
                        sources = db.execute('SELECT source,rank,observed FROM player_sources WHERE tag=?', (tag,)).fetchall()
                        global_source = next((s for s in sources if s[0] == 'global_ranked'), None)
                        db.execute('INSERT OR IGNORE INTO provenance VALUES (?,?,?,?)',
                                   (bid, tag, global_source[1] if global_source else None,
                                    global_source[2] if global_source else None))
                        db.execute('INSERT OR IGNORE INTO discovery_provenance VALUES (?,?,?,?)',
                                   (bid, tag, json.dumps(sources), time.time()))
                        discover_opponents(db, b)
                    db.execute('UPDATE uc_frontier SET fetched=? WHERE tag=?', (time.time(), tag))
                if client.requests % 25 == 0:
                    status()
            state = 'waiting'
            status()
            if players:
                continue
            while running() and time.time() < cycle + args.poll_minutes*60:
                time.sleep(5)
                if time.time() - (folder / 'status.json').stat().st_mtime >= 60:
                    status()
            # New players take priority; older players are revisited as capacity permits.
        state = 'stopped'
        status()
    except BaseException:
        state = 'failed'
        if db is not None and 'status' in locals():
            status()
        raise
    finally:
        if db is not None:
            db.close()
        lock.unlink(missing_ok=True)


if __name__ == '__main__':
    main()
