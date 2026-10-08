import copy
import sqlite3
import unittest
from datetime import datetime, timezone

from discovery import add, setup
from harvest import ranked_cohort, store_log, tables
from test_collect import fixture


class HarvestTests(unittest.TestCase):
    def ranked_fixture(self, league=7):
        battle = fixture()
        battle.update(
            battleTime='20260921T000000.000Z',
            type='pathOfLegend',
            leagueNumber=league,
            deckSelection='collection',
            gameMode={'id': 72000464, 'name': 'Ranked1v1_NewArena2'},
        )
        return battle

    def test_strict_ranked_cohort_allows_configured_leagues(self):
        now = datetime(2026, 9, 21, 1, tzinfo=timezone.utc).timestamp()
        for league in (5, 6, 7):
            self.assertTrue(ranked_cohort(self.ranked_fixture(league), '#A', now=now))
        modified = self.ranked_fixture(7)
        modified['modifiers'] = ['chaos']
        self.assertIsNone(ranked_cohort(modified, '#A', now=now))
        other_mode = self.ranked_fixture(7)
        other_mode['gameMode'] = {'id': 72000042, 'name': 'PickMode'}
        self.assertIsNone(ranked_cohort(other_mode, '#A', now=now))
        self.assertIsNone(ranked_cohort(self.ranked_fixture(7), '#OTHER', now=now))

    def test_store_log_deduplicates_and_expands_next_bfs_layer(self):
        db = sqlite3.connect(':memory:')
        # connect() normally creates the base battle tables; reproduce that
        # setup explicitly for an in-memory unit test.
        db.executescript('''
          CREATE TABLE battles(id TEXT PRIMARY KEY,battle_time TEXT,type TEXT,mode TEXT,
                               candidate INTEGER,fetched REAL,raw BLOB);
          CREATE TABLE players(tag TEXT PRIMARY KEY,fetched REAL);
        ''')
        tables(db)
        add(db, '#A', 'global_ranked', 1, observed=1, depth=0)
        battle = self.ranked_fixture(7)
        result = store_log(db, '#A', [battle, copy.deepcopy(battle)], fetched=1790000000,
                           max_age_days=1000)
        self.assertEqual(result['accepted'], 2)
        self.assertEqual(result['inserted'], 1)
        self.assertEqual(db.execute('SELECT COUNT(*) FROM battles').fetchone()[0], 1)
        self.assertEqual(db.execute('SELECT COUNT(*) FROM match_cohorts').fetchone()[0], 1)
        self.assertEqual(db.execute('SELECT depth FROM uc_frontier WHERE tag="#B"').fetchone()[0], 1)
        self.assertEqual(db.execute('SELECT source FROM player_sources WHERE tag="#B"').fetchone()[0],
                         'verified_ranked_match')

    def test_existing_frontier_member_keeps_discovery_order(self):
        db = sqlite3.connect(':memory:')
        setup(db)
        add(db, '#A', 'global_ranked', 1, observed=1, depth=0)
        add(db, '#A', 'verified_ranked_match', observed=2, depth=1)
        add(db, '#B', 'verified_ranked_match', observed=3, depth=1)
        self.assertEqual(db.execute(
            'SELECT tag,discovery_order FROM uc_frontier ORDER BY discovery_order').fetchall(),
            [('#A', 1), ('#B', 2)])


if __name__ == '__main__':
    unittest.main()
