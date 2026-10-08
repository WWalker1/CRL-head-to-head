import copy
from datetime import datetime, timezone
import unittest
import sqlite3
from discovery import setup, add, discover_opponents

from collect_leaderboard import accepted
from test_collect import fixture


class LeaderboardTests(unittest.TestCase):
    def test_discovery_deduplicates_and_preserves_poll_progress(self):
        db = sqlite3.connect(':memory:')
        setup(db)
        add(db, '#A', 'regional_ranked:123', 12, 100)
        db.execute('UPDATE uc_frontier SET fetched=150 WHERE tag=?', ('#A',))
        add(db, '#A', 'global_ranked', 900, 200)
        self.assertEqual(db.execute('SELECT COUNT(*), fetched FROM uc_frontier').fetchone(), (1, 150))
        self.assertEqual(db.execute('SELECT COUNT(*) FROM player_sources').fetchone()[0], 2)
        discover_opponents(db, fixture())
        self.assertEqual(db.execute('SELECT COUNT(*) FROM uc_frontier').fetchone()[0], 2)
        self.assertIsNone(db.execute('SELECT rank FROM player_sources WHERE source=? LIMIT 1', ('verified_uc_match',)).fetchone()[0])
        db.close()

    def setUp(self):
        self.now = datetime(2026, 9, 21, 1, tzinfo=timezone.utc).timestamp()
        self.b = fixture()
        self.b.update(type='pathOfLegend', leagueNumber=7, deckSelection='collection',
                      gameMode={'id': 72000464})

    def test_uc_match_accepted_from_either_side(self):
        self.assertTrue(accepted(self.b, '#A', self.now))
        self.assertTrue(accepted(self.b, '#B', self.now))

    def test_other_leagues_modes_and_sources_rejected(self):
        for patch in ({'leagueNumber': 6}, {'leagueNumber': 10}, {'type': 'PvP'},
                      {'deckSelection': 'draft'}, {'gameMode': {'id': 72000006}},
                      {'modifiers': ['special']}, {'battleTime': '20250101T000000.000Z'},
                      {'isHostedMatch': True}):
            with self.subTest(patch=patch):
                b = copy.deepcopy(self.b)
                b.update(patch)
                self.assertFalse(accepted(b, '#A', self.now))
        self.assertFalse(accepted(self.b, '#OTHER', self.now))

    def test_missing_league_is_not_assumed_uc(self):
        del self.b['leagueNumber']
        self.assertFalse(accepted(self.b, '#A', self.now))


if __name__ == '__main__':
    unittest.main()
