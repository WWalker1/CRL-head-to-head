import os
import unittest
from unittest.mock import Mock

from fastapi.testclient import TestClient

from service import app as service


class HistoryServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ['MODEL_SERVICE_TOKEN'] = 'history-test-token'
        cls.client = TestClient(service.app)
        cls.headers = {'authorization': 'Bearer history-test-token'}

    def setUp(self):
        self.runtime = Mock()
        self.runtime.manifest = {'model_id': 'test-model', 'training_cutoff': '2026-09-01T00:00:00Z'}
        self.runtime.tensorize.side_effect = self.tensorize
        self.runtime.predict_batch.return_value = [0.73]
        service.runtime = self.runtime

    @staticmethod
    def tensorize(decks):
        marker = decks[0].get('marker')
        if marker == 'unsupported':
            raise ValueError('A selected card form has no training support.')
        if marker == 'low-support':
            return None, None, ['Deck A includes a low-support form.']
        return None, None, []

    @staticmethod
    def match(match_id, marker='supported'):
        return {'id': match_id, 'decks': [{'marker': marker}, {'marker': marker}]}

    def test_requires_auth_and_validates_bounded_unique_ids(self):
        payload = {'matches': [self.match('a')]}
        self.assertEqual(self.client.post('/score-history', json=payload).status_code, 401)
        self.assertEqual(self.client.post('/score-history', json={'matches': []}, headers=self.headers).status_code, 422)
        self.assertEqual(self.client.post('/score-history', json={'matches': [self.match('x'), self.match('x')]}, headers=self.headers).status_code, 422)
        self.assertEqual(self.client.post('/score-history', json={'matches': [self.match('a' * 129)]}, headers=self.headers).status_code, 422)
        self.assertEqual(self.client.post('/score-history', json={'matches': [self.match(str(i)) for i in range(101)]}, headers=self.headers).status_code, 422)

    def test_scores_supported_pairs_and_skips_unsupported_or_low_support(self):
        response = self.client.post('/score-history', json={'matches': [
            self.match('good'), self.match('no-support', 'unsupported'), self.match('low', 'low-support')
        ]}, headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), {
            'model_version': 'test-model',
            'training_cutoff': '2026-09-01T00:00:00Z',
            'scores': [{'id': 'good', 'probability': 0.73}],
            'skipped': ['no-support', 'low'],
        })
        self.runtime.predict_batch.assert_called_once()
        batch = self.runtime.predict_batch.call_args.args[0]
        self.assertEqual(len(batch), 1)
        self.assertNotIn('outcome', str(response.json()).lower())

    def test_outcomes_are_rejected_as_extra_input(self):
        payload = {'matches': [{**self.match('a'), 'outcome': 'win'}]}
        self.assertEqual(self.client.post('/score-history', json=payload, headers=self.headers).status_code, 422)

    def test_ready_includes_cutoff(self):
        response = self.client.get('/ready')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['training_cutoff'], '2026-09-01T00:00:00Z')


if __name__ == '__main__':
    unittest.main()
