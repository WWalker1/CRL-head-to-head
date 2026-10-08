"""Archive available community battle logs, with bounded persistent BFS fan-out."""
import argparse,json,os,sqlite3,time,zlib,shutil
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote
from collect import ROOT,Client,BASES,credential,identity,candidate
from mode_policy import classify


def main():
    p=argparse.ArgumentParser();p.add_argument('--target',type=int,default=200000);p.add_argument('--max-hours',type=float,default=1);a=p.parse_args()
    folder=ROOT/'data/community';folder.mkdir(parents=True,exist_ok=True)
    seeds=json.loads((folder/'seeds.json').read_text(encoding='utf-8-sig'))
    if isinstance(seeds,dict):seeds=seeds['tags']
    if not seeds:raise RuntimeError('No community seeds available')
    lock=folder/'collector.lock';fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY);os.write(fd,str(os.getpid()).encode());os.close(fd)
    db=sqlite3.connect((folder/'battles.sqlite3').resolve().as_uri(),uri=True);db.execute('PRAGMA journal_mode=WAL')
    db.executescript('''CREATE TABLE IF NOT EXISTS frontier(tag TEXT PRIMARY KEY,depth INTEGER,fetched REAL);
        CREATE TABLE IF NOT EXISTS battles(id TEXT PRIMARY KEY,battle_time TEXT,type TEXT,mode TEXT,candidate INTEGER,fetched REAL,raw BLOB);
        CREATE TABLE IF NOT EXISTS cohorts(id TEXT PRIMARY KEY,cohort TEXT,league INTEGER,primary_overlap INTEGER);
        CREATE INDEX IF NOT EXISTS frontier_queue ON frontier(fetched,depth);''')
    primary=(ROOT/'data/ultimate-champion/battles.sqlite3').resolve().as_uri()+'?mode=ro'
    db.execute('ATTACH DATABASE ? AS prior',(primary,))
    with db:db.executemany('INSERT OR IGNORE INTO frontier VALUES (?,0,NULL)',[(t,) for t in seeds])
    client=Client(credential(ROOT.parent/'.env'),BASES['direct'],10);started=time.time();fetched=duplicates=0;state='collecting'
    def status():
        count=db.execute('SELECT COUNT(*) FROM battles').fetchone()[0]
        report=dict(state=state,pid=os.getpid(),updated_at=time.time(),unique_community_matches=count,
            overlap_with_primary=db.execute('SELECT COUNT(*) FROM cohorts WHERE primary_overlap=1').fetchone()[0],
            candidates=db.execute('SELECT COUNT(*) FROM frontier').fetchone()[0],seed_players=len(seeds),fetched_this_run=fetched,
            duplicate_views_this_run=duplicates,requests=client.requests,elapsed_seconds=round(time.time()-started),target=a.target,
            cohorts=dict(db.execute('SELECT cohort,COUNT(*) FROM cohorts GROUP BY cohort')))
        temp=folder/'status.tmp';temp.write_text(json.dumps(report,indent=2));temp.replace(folder/'status.json')
        print(json.dumps(report),flush=True);return count
    def fetch(item):
        tag,depth=item;return tag,depth,client.get('/players/'+quote(tag,safe='')+'/battlelog')
    try:
        count=status()
        with ThreadPoolExecutor(max_workers=10) as pool:
            while count<a.target and time.time()-started<a.max_hours*3600 and client.requests<36000:
                if (folder/'STOP').exists():break
                if shutil.disk_usage(folder).free<2*1024**3:raise RuntimeError('Insufficient free disk')
                rows=db.execute('SELECT tag,depth FROM frontier WHERE fetched IS NULL ORDER BY depth,rowid LIMIT 100').fetchall()
                if not rows:break
                for tag,depth,logs in pool.map(fetch,rows):
                    if logs is not None and not isinstance(logs,list):raise RuntimeError('Unexpected battlelog schema')
                    with db:
                        for b in logs or []:
                            bid=identity(b)
                            if not bid:continue
                            inserted=db.execute('INSERT OR IGNORE INTO battles VALUES (?,?,?,?,?,?,?)',
                                (bid,b['battleTime'],b.get('type'),json.dumps(b.get('gameMode')),int(candidate(b)),time.time(),zlib.compress(json.dumps(b).encode()))).rowcount
                            duplicates+=1-inserted
                            if inserted:
                                overlap=db.execute('SELECT 1 FROM prior.battles WHERE id=?',(bid,)).fetchone() is not None
                                db.execute('INSERT INTO cohorts VALUES (?,?,?,?)',(bid,classify(b),b.get('leagueNumber'),int(overlap)))
                            if depth<3:
                                tags={v.get('tag') for side in ('team','opponent') for v in b.get(side,[]) if isinstance(v.get('tag'),str)}
                                db.executemany('INSERT OR IGNORE INTO frontier VALUES (?,?,NULL)',[(t,depth+1) for t in tags])
                        db.execute('UPDATE frontier SET fetched=? WHERE tag=?',(time.time(),tag));fetched+=1
                count=status()
        state='stopped';status()
    except BaseException:
        state='failed';status();raise
    finally:
        db.close();lock.unlink(missing_ok=True)


if __name__=='__main__':main()
