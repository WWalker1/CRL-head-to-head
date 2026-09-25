"""Idempotent daily collection budget and audit report; invoked by the scheduler."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import time
from collect import ROOT


def count_games(database):
    db=sqlite3.connect(database.as_uri()+'?mode=ro',uri=True, timeout=10)
    try:
        return db.execute('SELECT COUNT(*) FROM battles').fetchone()[0]
    finally:
        db.close()


def write_json(path, value):
    """Atomically publish scheduler state so interruption cannot corrupt it."""
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, indent=2), encoding='utf-8')
    temporary.replace(path)


def read_json(path, default):
    """Read a prior state file, tolerating an interrupted legacy write."""
    if not path.exists():
        return default
    try:
        value = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return default
    return value if isinstance(value, dict) else default


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--new-games',type=int,default=200000)
    p.add_argument('--max-hours',type=float,default=1)
    p.add_argument('--dry-run',action='store_true')
    args=p.parse_args()
    if not 1<=args.new_games<=500000 or not 0<args.max_hours<=2: p.error('Use 1–500000 games and at most two hours.')
    folder=ROOT/'data/ultimate-champion'; database=(folder/'battles.sqlite3').resolve()
    daily=ROOT/'data/daily'; day=datetime.now(timezone.utc).strftime('%Y-%m-%d'); path=daily/(day+'.json')
    before=count_games(database)
    state=read_json(path, {'date_utc':day,'initial_count':before,'target':before+args.new_games,'requested_new_games':args.new_games})
    # A state file is the idempotency key for this UTC day.  Keep its original
    # target on retries, even if the scheduler's command-line defaults change.
    required = {'date_utc', 'initial_count', 'target', 'requested_new_games'}
    if not required.issubset(state) or state.get('date_utc') != day:
        state = {'date_utc':day,'initial_count':before,'target':before+args.new_games,'requested_new_games':args.new_games}
    command=[sys.executable,str(ROOT/'harvest.py'),'--target',str(state['target']),'--leagues','5,6,7',
             '--max-hours',str(args.max_hours),'--max-requests','45000','--rps','12','--workers','12']
    if args.dry_run:
        print(json.dumps({'current':before,'daily_target':state['target'],'command':command,'already_complete':before>=state['target']})); return
    daily.mkdir(parents=True,exist_ok=True)
    if before>=state['target']:
        print(json.dumps({'state':'already_complete','daily_report':str(path),'current':before}));return
    daily_lock=daily/(day+'.lock')
    try:
        fd=os.open(daily_lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY)
        os.write(fd,str(os.getpid()).encode()); os.close(fd)
    except FileExistsError:
        raise RuntimeError('Daily ingestion lock exists; inspect its PID before retrying.')
    try:
        if (folder/'collector.lock').exists(): raise RuntimeError('Collector lock exists; inspect its PID before retrying. No concurrent harvest started.')
        if (folder/'STOP').exists(): raise RuntimeError('Collection STOP file exists; not overriding it.')
        state.update(state='running',started_at=datetime.now(timezone.utc).isoformat())
        write_json(path, state)
        log=daily/(day+'.log')
        with log.open('a',encoding='utf-8') as stream:
            result=subprocess.run(command,stdout=stream,stderr=subprocess.STDOUT)
        after=count_games(database)
        status=read_json(folder/'status.json', {})
        state.update(state='failed' if result.returncode else 'complete' if after>=state['target'] else 'bounded_partial',
                     finished_at=datetime.now(timezone.utc).isoformat(),final_count=after,new_unique_games=after-state['initial_count'],
                     collector_exit_code=result.returncode,cohorts=status.get('cohorts'),candidate_players=status.get('candidate_players'),
                     requests_this_attempt=status.get('requests'),yield_per_log=status.get('new_per_successful_log'),log=str(log))
        write_json(path, state)
        print(json.dumps(state),flush=True)
        if result.returncode: raise SystemExit(result.returncode)
    finally:
        daily_lock.unlink(missing_ok=True)


if __name__=='__main__': main()
