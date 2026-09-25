import copy
from datetime import datetime, timezone
import sqlite3
import unittest
import numpy as np

from collect import identity
from harvest import store_log, tables
from prepare_data import normalize, level, split_rows, vocab_for, arrays


def fixture():
    players = []
    for tag, crowns, delta in [('#A', 1, 20), ('#B', 0, -20)]:
        players.append(dict(tag=tag, crowns=crowns, trophyChange=delta, startingTrophies=2000,
            cards=[dict(id=i+1, level=16, maxLevel=16, rarity='common', elixirCost=3) for i in range(8)],
            supportCards=[dict(id=159000000, level=16, maxLevel=16, rarity='common')],
            elixirLeaked=999, kingTowerHitPoints=123))
    return dict(type='pathOfLegend', leagueNumber=7, deckSelection='collection', gameMode={'id':72000464},
                battleTime='20260921T000000.000Z', team=[players[0]], opponent=[players[1]])


NOW = datetime(2026,9,21,1,tzinfo=timezone.utc).timestamp()


class PreparationTests(unittest.TestCase):
    def test_reversed_api_view_has_identical_features_and_label(self):
        b = fixture()
        expected = normalize(b, identity(b), NOW)
        reverse = copy.deepcopy(b)
        reverse['team'], reverse['opponent'] = reverse['opponent'], reverse['team']
        reverse['team'][0]['cards'].reverse()
        self.assertEqual(expected, normalize(reverse, identity(reverse), NOW))
        self.assertNotIn('elixirLeaked', expected)
        self.assertNotIn('crowns', expected)

    def test_mirror_cost_is_explicitly_masked(self):
        b = fixture()
        card = b['team'][0]['cards'][0]
        card['id'] = 28000006
        del card['elixirCost']
        r = normalize(b, identity(b), NOW)
        self.assertEqual(r['numeric'][0][-1][1:4], [0,0,1])

    def test_tie_conflict_and_unrecognized_form_are_excluded(self):
        for change in ('tie','conflict','form'):
            b = fixture()
            if change == 'tie': b['team'][0]['crowns'] = 0
            if change == 'conflict': b['team'][0]['trophyChange'] = -20
            if change == 'form': b['team'][0]['cards'][0]['evolutionLevel'] = 99
            with self.assertRaises(ValueError): normalize(b, identity(b), NOW)

    def test_rarity_levels(self):
        for rarity, raw in [('common',16),('rare',14),('epic',11),('legendary',8),('champion',6)]:
            self.assertEqual(level(dict(rarity=rarity, level=raw, maxLevel=raw)),16)

    def test_split_vocab_and_weights_do_not_see_future(self):
        base = normalize(fixture(), identity(fixture()), NOW)
        rows = []
        for i in range(100):
            r = copy.deepcopy(base)
            r['timestamp'] += (i//2)*86400
            r['match_id'] = str(i)
            if i >= 90: r['cards'][0][0] = 99999
            rows.append(r)
        parts, _, _ = split_rows(rows)
        cards, towers = vocab_for(parts['train'],'cards'), vocab_for(parts['train'],'towers')
        self.assertNotIn('99999', cards)
        self.assertLess(max(r['timestamp'] for r in parts['train']), min(r['timestamp'] for r in parts['validation']))
        cutoff = max(r['timestamp'] for r in parts['train'])
        train = arrays(parts['train'],cards,towers,cutoff,14,True)
        test = arrays(parts['test'],cards,towers,cutoff,14,False)
        self.assertAlmostEqual(float(train['weight'][-1]),1)
        self.assertTrue(np.all(test['card_ids'][:,0,0] == 1))
        self.assertTrue(np.all(test['weight'] == 1))

    def test_mixed_ranked_cohort_keeps_league_slice(self):
        b = fixture()
        b['leagueNumber'] = 5
        row = normalize(b, identity(b), NOW, allowed_leagues=(5, 6, 7))
        self.assertEqual(row['league_number'], 5)
        values = arrays([row], vocab_for([row], 'cards'), vocab_for([row], 'towers'), row['timestamp'], 14, False)
        self.assertEqual(values['league_number'].tolist(), [5])

    def test_non_requested_league_is_rejected(self):
        b = fixture()
        b['leagueNumber'] = 5
        with self.assertRaises(ValueError):
            normalize(b, identity(b), NOW, allowed_leagues=(7,))

    def test_lower_league_omitted_rating_and_delta(self):
        b=fixture();b['leagueNumber']=6
        for p in (b['team'][0],b['opponent'][0]):
            p.pop('startingTrophies');p.pop('trophyChange')
        row=normalize(b,identity(b),NOW,allowed_leagues=(5,6,7))
        self.assertEqual(row['label'],1)
        self.assertEqual(row['ratings'],[0,0])
        b['leagueNumber']=7
        with self.assertRaises(ValueError): normalize(b,identity(b),NOW)

    def test_sqlite_deduplicates_both_player_views(self):
        db = sqlite3.connect(':memory:')
        db.execute('CREATE TABLE battles(id TEXT PRIMARY KEY,battle_time TEXT,type TEXT,mode TEXT,candidate INTEGER,fetched REAL,raw BLOB)')
        tables(db)
        b = fixture()
        first = store_log(db, '#A', [b], NOW)
        b['team'],b['opponent'] = b['opponent'],b['team']
        second = store_log(db, '#B', [b], NOW)
        self.assertEqual(first['inserted'],1)
        self.assertEqual(second['duplicates'],1)
        self.assertEqual(db.execute('SELECT COUNT(*) FROM battles').fetchone()[0],1)
        db.close()


if __name__ == '__main__':
    unittest.main()
