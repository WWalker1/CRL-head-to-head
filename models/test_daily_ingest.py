import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import daily_ingest


class DailyIngestTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.folder = self.root / 'data' / 'ultimate-champion'
        self.folder.mkdir(parents=True)
        self.database = self.folder / 'battles.sqlite3'
        db = sqlite3.connect(self.database)
        db.execute('CREATE TABLE battles(id TEXT PRIMARY KEY)')
        db.executemany('INSERT INTO battles VALUES (?)', [('a',), ('b',)])
        db.commit()
        db.close()

    def tearDown(self):
        self.tmp.cleanup()

    def run_main(self, *args):
        with patch.object(daily_ingest, 'ROOT', self.root):
            with patch('sys.argv', ['daily_ingest.py', *args]):
                daily_ingest.main()

    def test_count_games_uses_read_only_connection(self):
        self.assertEqual(daily_ingest.count_games(self.database), 2)

    def test_dry_run_does_not_start_collector(self):
        with patch.object(daily_ingest, 'ROOT', self.root), \
             patch('sys.argv', ['daily_ingest.py', '--new-games', '3', '--dry-run']), \
             patch('daily_ingest.subprocess.run') as run:
            daily_ingest.main()
        run.assert_not_called()
        self.assertFalse((self.root / 'data' / 'daily').exists())

    def test_completed_run_is_recorded_and_second_run_is_idempotent(self):
        status = {'cohorts': {'ultimate_champion_ranked': 2}, 'candidate_players': 10,
                  'requests': 4, 'new_per_successful_log': 1.0}
        self.folder.joinpath('status.json').write_text(json.dumps(status), encoding='utf-8')

        def fake_run(command, stdout, stderr):
            # Simulate the collector adding exactly three unique games.
            db = sqlite3.connect(self.database)
            db.executemany('INSERT INTO battles VALUES (?)', [('c',), ('d',), ('e',)])
            db.commit(); db.close()
            return SimpleNamespace(returncode=0)

        with patch.object(daily_ingest, 'ROOT', self.root), \
             patch('sys.argv', ['daily_ingest.py', '--new-games', '3']), \
             patch('daily_ingest.subprocess.run', side_effect=fake_run) as run:
            daily_ingest.main()
            daily_ingest.main()
        self.assertEqual(run.call_count, 1)
        report = json.loads(next((self.root / 'data' / 'daily').glob('*.json')).read_text())
        self.assertEqual(report['state'], 'complete')
        self.assertEqual(report['new_unique_games'], 3)

    def test_lock_refuses_concurrent_run_before_subprocess(self):
        self.folder.joinpath('collector.lock').write_text('999', encoding='utf-8')
        with patch.object(daily_ingest, 'ROOT', self.root), \
             patch('sys.argv', ['daily_ingest.py', '--new-games', '3']), \
             patch('daily_ingest.subprocess.run') as run:
            with self.assertRaisesRegex(RuntimeError, 'Collector lock'):
                daily_ingest.main()
        run.assert_not_called()

    def test_daily_lock_refuses_wrapper_race(self):
        daily = self.root / 'data' / 'daily'
        daily.mkdir()
        daily.joinpath('2026-09-21.lock').write_text('999', encoding='utf-8')
        with patch.object(daily_ingest, 'ROOT', self.root), \
             patch('sys.argv', ['daily_ingest.py', '--new-games', '3']), \
             patch('daily_ingest.subprocess.run') as run:
            with self.assertRaisesRegex(RuntimeError, 'Daily ingestion lock'):
                daily_ingest.main()
        run.assert_not_called()

    def test_failed_collector_still_writes_audit_state_without_status_file(self):
        def fake_run(command, stdout, stderr):
            return SimpleNamespace(returncode=7)

        with patch.object(daily_ingest, 'ROOT', self.root), \
             patch('sys.argv', ['daily_ingest.py', '--new-games', '3']), \
             patch('daily_ingest.subprocess.run', side_effect=fake_run):
            with self.assertRaises(SystemExit) as error:
                daily_ingest.main()
        self.assertEqual(error.exception.code, 7)
        report = json.loads(next((self.root / 'data' / 'daily').glob('*.json')).read_text())
        self.assertEqual(report['state'], 'failed')
        self.assertEqual(report['collector_exit_code'], 7)


if __name__ == '__main__':
    unittest.main()
