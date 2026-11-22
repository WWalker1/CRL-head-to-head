"""Unit tests for the standalone editorial collector (no network or credentials)."""
import importlib.util
from datetime import datetime, timedelta, timezone
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("weekly_meta", Path(__file__).with_name("weekly_meta.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def battle(tag, enemy, timestamp, won=True, deck=None):
    cards = deck or [{"id": 26000000 + i, "name": f"Card {i}", "iconUrls": {"medium": ""}} for i in range(8)]
    return {
        "type": "pathOfLegend", "gameMode": {"id": module.MODE_ID},
        "deckSelection": "collection", "battleTime": timestamp,
        "team": [{"tag": tag, "cards": cards, "crowns": 2 if won else 0}],
        "opponent": [{"tag": enemy, "cards": cards, "crowns": 0 if won else 2}],
    }


class WeeklyMetaTests(unittest.TestCase):
    def setUp(self):
        self.end = datetime(2026, 11, 22, tzinfo=timezone.utc)
        self.start = self.end - timedelta(days=7)
        self.time = "20261120T120000.000Z"

    def test_deck_invariant_under_card_order(self):
        cards = [{"id": x} for x in range(8)]
        self.assertEqual(module.deck_key(cards), module.deck_key(list(reversed(cards))))
        self.assertIsNone(module.deck_key(cards[:-1]))
        self.assertIsNone(module.deck_key([cards[0]] * 8))

    def test_deduplicates_same_player_battle(self):
        b = battle("#A", "#B", self.time)
        r = module.aggregate([("#A", b), ("#A", b)], self.end, self.start, self.end, 1, 1)
        self.assertEqual(r["sampledPlayerDeckAppearances"], 1)
        self.assertEqual(r["decks"][0]["games"], 1)
        self.assertEqual(r["decks"][0]["winRate"], 100)

    def test_counts_opposing_top_players_once_each(self):
        b = battle("#A", "#B", self.time)
        r = module.aggregate([("#A", b), ("#B", b)], self.end, self.start, self.end, 2, 1)
        self.assertEqual(r["sampledPlayerDeckAppearances"], 2)
        self.assertEqual(r["physicalMatches"], 1)
        self.assertEqual(r["decks"][0]["wins"], 1)
        self.assertEqual(r["decks"][0]["winRate"], 50)

    def test_filters_non_ranked_and_modified_matches(self):
        b = battle("#A", "#B", self.time)
        b["modifiers"] = [{"name": "special"}]
        self.assertIsNone(module.ranked_battle(b, "#A", self.start, self.end))
        b.pop("modifiers")
        b["type"] = "friendly"
        self.assertIsNone(module.ranked_battle(b, "#A", self.start, self.end))

    def test_forms_are_distinct_and_unknown_forms_rejected(self):
        cards = battle("#A", "#B", self.time)["team"][0]["cards"]
        cards[0]["evolutionLevel"] = 1
        evo = module.deck_key(cards)
        cards[0]["evolutionLevel"] = 2
        self.assertNotEqual(evo, module.deck_key(cards))
        cards[0]["evolutionLevel"] = 3
        self.assertIsNone(module.deck_key(cards))

    def test_months_pool_counts_and_reject_overlapping_windows(self):
        from archive import monthly_report
        b = battle("#A", "#B", self.time)
        part = module.aggregate([("#A",b),("#B",b)], self.end,self.start,self.end,2,1)
        report = monthly_report([part], "2026-11", 1)
        self.assertEqual(report["decks"][0]["winRate"], 50)
        self.assertRaises(ValueError, monthly_report, [part,part], "2026-11", 1)

    def test_retries_rate_limit(self):
        from unittest.mock import patch, MagicMock
        import io
        response = MagicMock()
        response.__enter__.return_value = io.BytesIO(b'{"ok":true}')
        error = module.HTTPError("https://example.test",429,"limited",{"Retry-After":"2"},None)
        with patch.dict(module.os.environ, CLASH_ROYALE_API_KEY="test"), patch.object(module,"urlopen",side_effect=[error,response]), patch.object(module.time,"sleep") as sleep:
            self.assertEqual(module.request_json("/cards"), {"ok":True})
            sleep.assert_called_once_with(2)

    def test_rejects_old_battles_and_draws(self):
        b = battle("#A", "#B", "20261101T120000.000Z")
        self.assertIsNone(module.ranked_battle(b, "#A", self.start, self.end))
        b = battle("#A", "#B", self.time)
        b["team"][0]["crowns"] = 1
        b["opponent"][0]["crowns"] = 1
        self.assertIsNone(module.ranked_battle(b, "#A", self.start, self.end))


if __name__ == "__main__":
    unittest.main()
