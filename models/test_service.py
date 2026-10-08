import json,unittest
import os,sys,torch
from pathlib import Path
from service.model import Runtime
from service.search import DeckSearch

class ServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bundle=Path(__file__).parent/'data'/'bundle'; cls.r=Runtime(cls.bundle); cls.ex=json.loads((cls.bundle/'examples.json').read_text())[0]['decks']; cls.s=DeckSearch(cls.r)
    def test_known_fixture_and_swap(self):
        a=self.r.predict(self.ex); b=self.r.predict([self.ex[1],self.ex[0]])
        self.assertAlmostEqual(a['probability_a']+b['probability_a'],1,places=5)
    def test_permutation_invariance(self):
        d=[dict(x,cards=list(x['cards'])) for x in self.ex]; base=self.r.predict(d)['probability_a']; d[0]['cards'].reverse(); self.assertAlmostEqual(base,self.r.predict(d)['probability_a'],places=5)
    def test_invalid_cards_and_duplicates(self):
        d=[dict(x,cards=list(x['cards'])) for x in self.ex]; d[0]['cards'][0]={'key':'missing:9','level':16}
        with self.assertRaises(ValueError): self.r.predict(d)
        d=[dict(x,cards=list(x['cards'])) for x in self.ex]; d[0]['cards'][1]=d[0]['cards'][0]
        with self.assertRaises(ValueError): self.r.predict(d)
    def test_locked_and_excluded_search(self):
        keys=[x['key'] for x in self.ex[0]['cards']]; result=self.s.run(locked=keys[:4],excluded=[keys[5]],budget=64,seconds=1)
        self.assertTrue(result['candidates'])
        for candidate in result['candidates']:
            returned = {x['key'] for x in candidate['deck']['cards']}
            self.assertTrue(set(keys[:4]).issubset(returned))
            self.assertNotIn(keys[5], returned)
    def test_fully_locked_completion(self):
        keys=[x['key'] for x in self.ex[0]['cards']]; result=self.s.run(locked=keys,budget=32,seconds=1); self.assertTrue(result['candidates'])
    def test_excluded_lock_rejected(self):
        key=self.ex[0]['cards'][0]['key']
        with self.assertRaises(ValueError): self.s.run(locked=[key],excluded=[key],budget=32)
    def test_original_checkpoint_logit_parity(self):
        # Compare the portable preprocessing/model against the frozen research implementation.
        orig=Path(r'C:\Users\22wes\Programming Projects\head-to-head-royale\models')
        sys.path.insert(0,str(orig))
        from attention_data import MatchupAttention as Original
        ck=torch.load(orig/'data'/'runs'/'20260921T223438Z'/'attention.pt',map_location='cpu',weights_only=True)
        model=Original(ck['cards'],ck['towers']); model.load_state_dict(ck['state_dict']); model.eval()
        batch,_,_=self.r.tensorize(self.ex)
        with torch.inference_mode(): expected=model(batch); actual=self.r.model(batch)
        self.assertTrue(torch.allclose(expected,actual,atol=1e-6,rtol=1e-6))

    def test_http_contracts(self):
        try:
            from fastapi.testclient import TestClient
            os.environ['MODEL_SERVICE_TOKEN']='unit-test-token'; os.environ['MODEL_BUNDLE']=str(self.bundle)
            from service import app as module
            module.runtime=self.r; module.searcher=self.s
            client=TestClient(module.app)
            self.assertEqual(client.get('/catalog').status_code,401)
            self.assertEqual(client.get('/catalog',headers={'authorization':'Bearer unit-test-token'}).status_code,200)
            bad=client.post('/predict',json={'decks':[]},headers={'authorization':'Bearer unit-test-token'}); self.assertEqual(bad.status_code,422)
            complete=client.post('/complete',json={'locked':[],'budget':32},headers={'authorization':'Bearer unit-test-token'}); self.assertEqual(complete.status_code,200)
        except ImportError: self.skipTest('FastAPI test dependencies unavailable')

if __name__=='__main__': unittest.main()
