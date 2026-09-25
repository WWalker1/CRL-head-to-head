"""Measured crawl yield and explicit first-pass scenario projections (not guarantees)."""
import json
import sqlite3
import time
from collect import ROOT


def main():
    folder = ROOT/'data/ultimate-champion'
    db = sqlite3.connect((folder/'battles.sqlite3').as_uri()+'?mode=ro', uri=True)
    db.execute('BEGIN')
    logs, raw, eligible, dupes, inserted, oldest, newest = db.execute('''SELECT COUNT(*), SUM(received), SUM(accepted),
        SUM(duplicates), SUM(inserted), MIN(fetched), MAX(fetched) FROM fetch_metrics''').fetchone()
    pool, pending = db.execute('SELECT COUNT(*),SUM(fetched IS NULL) FROM uc_frontier').fetchone()
    total = db.execute('SELECT COUNT(*) FROM battles').fetchone()[0]
    recent = db.execute('SELECT COUNT(*) FROM battles WHERE fetched>?', (time.time()-300,)).fetchone()[0]
    db.close()
    mean_returned = (raw or 0)/max(1,logs)
    mean_eligible = (eligible or 0)/max(1,logs)
    status = json.loads((folder/'status.json').read_text())
    report = {'generated_at':time.time(), 'unique_uc_games':total, 'candidate_ids':pool,'unfetched_ids':pending,
              'successful_logs_measured':logs,'returned_observations':raw,'eligible_observations':eligible,
              'duplicate_eligible_observations':dupes,'new_unique_matches_measured':inserted,
              'mean_returned_per_log':round(mean_returned,3), 'mean_eligible_per_log':round(mean_eligible,3),
              'eligible_fraction':round((eligible or 0)/max(1,raw or 0),4),
              'observed_duplicate_fraction':round((dupes or 0)/max(1,eligible or 0),4),
              'actual_new_last_5_minutes':recent, 'status_age_seconds':round(time.time()-status['updated_at']),
              'original_25000_player_first_pass_scenarios':{
                  '50_percent_unique_retention':round(25000*mean_eligible*0.5),
                  '65_percent_unique_retention':round(25000*mean_eligible*0.65),
                  '80_percent_unique_retention':round(25000*mean_eligible*0.8)},
              'assumptions':['Current observed eligibility rate persists across remaining candidates.',
                             'Retention scenarios account for seeing a match from both participants; they are not confidence intervals.',
                             'Current sample is not random or independent; discovery prioritizes previously unfetched tags.',
                             'An expanded player pool is additional potential, not a promise of more unique matches.',
                             'Initial recent-history fetch rate will fall during subsequent polling.']}
    (folder/'yield-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))


if __name__ == '__main__':
    main()
