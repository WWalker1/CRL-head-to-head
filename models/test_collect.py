import copy
import io
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

from collect import Client, candidate, connect, credential, identity


def fixture():
    return {'battleTime': '20260921T000000.000Z', 'type': 'PvP', 'gameMode': {'id': 1},
            'team': [{'tag': '#A', 'crowns': 1, 'cards': [{'id': i} for i in range(8)]}],
            'opponent': [{'tag': '#B', 'crowns': 0, 'cards': [{'id': i} for i in range(8, 16)]}]}


class CollectorTests(unittest.TestCase):
    def test_connection_reset_is_retried(self):
        client = Client('fake-test-token', 'https://api.clashroyale.com/v1', 2)
        with patch('collect.urlopen', side_effect=[ConnectionResetError(), io.BytesIO(b'[]')]), patch('collect.time.sleep'):
            self.assertEqual(client.get('/cards'), [])
        self.assertEqual(client.requests, 2)

    def test_lowercase_and_uppercase_keys(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict('os.environ', {}, clear=True):
            path = Path(tmp) / '.env'
            for name in ('crl_api_key', 'CRL_API_KEY'):
                path.write_text(name + '=test-not-a-real-secret', encoding='utf-8')
                self.assertEqual(credential(path), 'test-not-a-real-secret')

    def test_same_match_from_both_players_deduplicates(self):
        a = fixture()
        b = copy.deepcopy(a)
        b['team'], b['opponent'] = b['opponent'], b['team']
        self.assertEqual(identity(a), identity(b))
        b['battleTime'] = '20260921T000100.000Z'
        self.assertNotEqual(identity(a), identity(b))

    def test_structural_filter(self):
        b = fixture()
        self.assertTrue(candidate(b))
        b['team'].append(copy.deepcopy(b['team'][0]))
        self.assertFalse(candidate(b))
        b = fixture()
        b['team'][0]['cards'][0]['id'] = 1
        self.assertFalse(candidate(b))
        b = fixture()
        del b['opponent'][0]['crowns']
        self.assertFalse(candidate(b))

    def test_missing_identity_rejected(self):
        b = fixture()
        del b['battleTime']
        self.assertIsNone(identity(b))

    def test_frontier_survives_restart(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'test.sqlite3'
            db = connect(path)
            db.execute('INSERT INTO players VALUES (?,NULL)', ('#A',))
            db.commit()
            db.close()
            db = connect(path)
            self.assertEqual(db.execute('SELECT tag FROM players WHERE fetched IS NULL').fetchone(), ('#A',))
            db.close()


if __name__ == '__main__':
    unittest.main()
