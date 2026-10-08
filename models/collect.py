"""Isolated, resumable public battle-log collector; Python standard library only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import random
import shutil
import sqlite3
import time
import threading
from http.client import HTTPException
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen
import zlib

ROOT = Path(__file__).resolve().parent
BASES = {'direct': 'https://api.clashroyale.com/v1',
         'proxy': 'https://proxy.royaleapi.dev/v1'}


def credential(path):
    key = os.environ.get('crl_api_key') or os.environ.get('CRL_API_KEY')
    if not key and path.exists():
        for line in path.read_text(encoding='utf-8-sig').splitlines():
            name, sep, value = line.strip().removeprefix('export ').partition('=')
            if sep and name.strip().lower() == 'crl_api_key':
                key = value.strip().strip('\"\'')
    if not key:
        raise SystemExit('Missing CRL_API_KEY. Save it in the root .env or use --env-file. No API requests made.')
    return key


def identity(battle):
    """Perspective-independent identity; not a Supercell-issued battle ID."""
    tags = sorted(p.get('tag', '') for side in ('team', 'opponent')
                  for p in battle.get(side, []))
    if not battle.get('battleTime') or not tags or any(not t for t in tags):
        return None
    value = [battle['battleTime'], tags, battle.get('type'),
             battle.get('gameMode', {}).get('id')]
    return hashlib.sha256(json.dumps(value, separators=(',', ':')).encode()).hexdigest()


def candidate(b):
    """Structural candidate only: mode semantics still require a live schema audit."""
    sides = [b.get(s, []) for s in ('team', 'opponent')]
    if any(len(s) != 1 for s in sides):
        return False
    for side in sides:
        cards = side[0].get('cards', [])
        if len(cards) != 8 or len({c.get('id') for c in cards}) != 8:
            return False
        if any(c.get('id') is None for c in cards):
            return False
        if not isinstance(side[0].get('crowns'), int):
            return False
    return True


class Client:
    def __init__(self, key, base, rps):
        self.key, self.base, self.delay = key, base, 1 / rps
        self.last = 0
        self.requests = 0
        self.lock = threading.Lock()

    def get(self, endpoint):
        for attempt in range(6):
            with self.lock:
                time.sleep(max(0, self.last + self.delay - time.monotonic()))
                self.last = time.monotonic()
                self.requests += 1
            req = Request(self.base + endpoint, headers={
                'Authorization': 'Bearer ' + self.key, 'Accept': 'application/json'})
            try:
                with urlopen(req, timeout=30) as response:
                    return json.load(response)
            except HTTPError as error:
                if error.code in (401, 403):
                    raise SystemExit(f'API HTTP {error.code}: check key and allowed IP for selected endpoint. Response body suppressed.')
                if error.code == 404:
                    return None
                if error.code != 429 and error.code < 500:
                    raise SystemExit(f'API HTTP {error.code}; stopped. Response body suppressed.')
                retry = error.headers.get('Retry-After', '')
                wait = float(retry) if retry.isdigit() else 2 ** attempt + random.random()
            except (URLError, TimeoutError, ConnectionError, HTTPException, json.JSONDecodeError):
                wait = 2 ** attempt + random.random()
            time.sleep(min(wait, 300))
        raise SystemExit('Repeated API/network errors; stopped. Database can be resumed.')


def connect(path):
    db = sqlite3.connect(path)
    db.execute('PRAGMA journal_mode=WAL')
    db.executescript('''
        CREATE TABLE IF NOT EXISTS players(tag TEXT PRIMARY KEY, fetched REAL);
        CREATE INDEX IF NOT EXISTS unfetched_players ON players(fetched);
        CREATE TABLE IF NOT EXISTS battles(
            id TEXT PRIMARY KEY, battle_time TEXT NOT NULL, type TEXT,
            mode TEXT, candidate INTEGER NOT NULL, fetched REAL, raw BLOB NOT NULL);
        CREATE TABLE IF NOT EXISTS runs(started REAL, ended REAL, requests INTEGER,
            received INTEGER, inserted INTEGER, candidate_count INTEGER);
    ''')
    return db


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--env-file', type=Path, default=ROOT.parent / '.env')
    p.add_argument('--endpoint', choices=BASES, default='direct')
    p.add_argument('--seed', action='append', required=True, help='Public player tag; repeat for diverse seeds')
    p.add_argument('--target', type=int, default=10000, help='Total unique structural candidates, including existing database')
    p.add_argument('--max-hours', type=float, default=1)
    p.add_argument('--max-requests', type=int, default=1000)
    p.add_argument('--rps', type=float, default=1)
    p.add_argument('--data-dir', type=Path, default=ROOT / 'data')
    args = p.parse_args()
    if min(args.target, args.max_hours, args.max_requests, args.rps) <= 0:
        p.error('Limits must be positive')
    client = Client(credential(args.env_file), BASES[args.endpoint], args.rps)
    args.data_dir.mkdir(parents=True, exist_ok=True)
    db = connect(args.data_dir / 'battles.sqlite3')
    for tag in args.seed:
        db.execute('INSERT OR IGNORE INTO players VALUES (?,NULL)', ('#' + tag.lstrip('#').upper(),))
    db.commit()
    started = time.time()
    received = inserted = 0
    count = db.execute('SELECT COUNT(*) FROM battles WHERE candidate=1').fetchone()[0]
    # Snapshot card metadata separately: never replace historical snapshots with today's values.
    cards = client.get('/cards')
    if not isinstance(cards, dict) or not isinstance(cards.get('items'), list):
        raise SystemExit('Unexpected card catalog response; stopped.')
    (args.data_dir / f'cards-{int(started)}.json').write_text(json.dumps(cards), encoding='utf-8')
    try:
        while count < args.target and client.requests < args.max_requests and time.time() - started < args.max_hours * 3600:
            if (args.data_dir / 'STOP').exists():
                print('STOP file detected; checkpointing and exiting.', flush=True)
                break
            if shutil.disk_usage(args.data_dir).free < 2 * 1024**3:
                raise SystemExit('Stopped: less than 2 GiB free disk space.')
            row = db.execute('SELECT tag FROM players WHERE fetched IS NULL ORDER BY rowid LIMIT 1').fetchone()
            if not row:
                print('Discovery frontier exhausted; add more diverse --seed tags.', flush=True)
                break
            tag = row[0]
            battles = client.get('/players/' + quote(tag, safe='') + '/battlelog')
            if battles is None:
                battles = []
            if not isinstance(battles, list):
                raise SystemExit('Unexpected battle-log response shape; stopped before processing.')
            if battles and not (args.data_dir / 'sample-battle.json').exists():
                (args.data_dir / 'sample-battle.json').write_text(json.dumps(battles[0], indent=2), encoding='utf-8')
                print(json.dumps({'first_log_length': len(battles), 'battle_fields': sorted(battles[0]),
                                  'player_fields': sorted(battles[0].get('team', [{}])[0])}), flush=True)
            received += len(battles)
            with db:
                for b in battles:
                    bid = identity(b)
                    if bid is None:
                        continue
                    eligible = candidate(b)
                    cursor = db.execute('INSERT OR IGNORE INTO battles VALUES (?,?,?,?,?,?,?)',
                        (bid, b['battleTime'], b.get('type'), json.dumps(b.get('gameMode')),
                         int(eligible), time.time(), zlib.compress(json.dumps(b).encode())))
                    inserted += cursor.rowcount
                    count += cursor.rowcount * int(eligible)
                    for side in ('team', 'opponent'):
                        for player in b.get(side, []):
                            if player.get('tag'):
                                db.execute('INSERT OR IGNORE INTO players VALUES (?,NULL)', (player['tag'],))
                db.execute('UPDATE players SET fetched=? WHERE tag=?', (time.time(), tag))
            if client.requests % 25 == 0:
                status = {'pid': os.getpid(), 'updated_at': time.time(),
                          'elapsed_seconds': round(time.time() - started),
                          'requests': client.requests, 'received': received,
                          'new_unique': inserted, 'total_candidates': count,
                          'target': args.target, 'target_reached': count >= args.target}
                temporary = args.data_dir / 'status.tmp'
                temporary.write_text(json.dumps(status, indent=2), encoding='utf-8')
                temporary.replace(args.data_dir / 'status.json')
                print(json.dumps(status), flush=True)
    finally:
        with db:
            db.execute('INSERT INTO runs VALUES (?,?,?,?,?,?)',
                       (started, time.time(), client.requests, received, inserted, count))
        summary = {'requests': client.requests, 'received': received, 'new_unique': inserted,
                   'total_candidates': count, 'target': args.target, 'target_reached': count >= args.target}
        (args.data_dir / 'latest-run.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
        print(json.dumps(summary), flush=True)
        db.close()


if __name__ == '__main__':
    main()
