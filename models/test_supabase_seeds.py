import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import supabase_seeds


class FakeResponse(io.BytesIO):
    def __init__(self, payload):
        super().__init__(json.dumps(payload).encode())

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


class SupabaseSeedTests(unittest.TestCase):
    def test_normalize_tag_is_strict_and_canonical(self):
        self.assertEqual(supabase_seeds.normalize_tag('  #abc123  '), '#ABC123')
        self.assertEqual(supabase_seeds.normalize_tag('abc123'), '#ABC123')
        self.assertIsNone(supabase_seeds.normalize_tag('email@example.com'))
        self.assertIsNone(supabase_seeds.normalize_tag('#ab'))

    def test_config_missing_credentials_makes_no_request(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict('os.environ', {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, 'No Supabase request'):
                supabase_seeds.config(Path(folder) / '.env')

    def test_collects_both_tables_and_paginates_without_writes(self):
        calls = []
        pages = {
            ('tracked_friends', 0): [{'friend_player_tag': '#abc123'}, {'friend_player_tag': 'bad email'}],
            ('tracked_friends', 2): [{'friend_player_tag': '#DUP123'}],
            ('user_ratings', 0): [{'player_tag': '#DUP123'}, {'player_tag': '#xyz789'}],
        }

        def opener(request, timeout):
            calls.append(request.full_url)
            table = 'tracked_friends' if '/tracked_friends?' in request.full_url else 'user_ratings'
            offset = int(request.full_url.split('offset=')[1].split('&')[0])
            return FakeResponse(pages.get((table, offset), []))

        tags, report = supabase_seeds.collect_tags('https://example.supabase.co', 'secret', 2, opener)
        self.assertEqual(tags, ['#ABC123', '#DUP123', '#XYZ789'])
        self.assertEqual(report['unique_tags'], 3)
        self.assertEqual(report['tables']['tracked_friends']['pages'], 2)
        self.assertEqual(len(calls), 4)
        self.assertTrue(all('select=' in call for call in calls))
        self.assertTrue(all('email' not in call for call in calls))

    def test_seed_file_contains_only_tags_and_aggregate_counts(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'seeds.json'
            supabase_seeds.write_seed_file(path, ['#ABC123'], {'unique_tags': 1})
            payload = json.loads(path.read_text(encoding='utf-8'))
            self.assertEqual(payload['tags'], ['#ABC123'])
            self.assertEqual(payload['counts'], {'unique_tags': 1})
            self.assertNotIn('email', json.dumps(payload).lower())


if __name__ == '__main__':
    unittest.main()
