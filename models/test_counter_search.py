import unittest
from counter_search import CounterSearch, legal


class CounterTests(unittest.TestCase):
    def setUp(self):
        variants=[dict(key=f'{i}:0',card_id=i,form=0,champion=i in (10,11,12),
                       min_level=1,elixir=3,train_occurrences=1000) for i in range(1,17)]
        variants += [dict(key=f'{i}:1',card_id=i,form=1,champion=False,
                          min_level=1,elixir=3,train_occurrences=1000) for i in (1,2,3)]
        self.lookup={c['key']:c for c in variants}
        self.engine=CounterSearch({'variants':variants},[
            {'keys':[f'{i}:0' for i in range(1,9)],'count':10},
            {'keys':[f'{i}:0' for i in range(5,13) if i!=12]+['13:0'],'count':5}])

    def test_special_slots_and_base_uniqueness(self):
        self.assertFalse(legal(['1:0','1:1'],self.lookup,False))
        self.assertFalse(legal(['1:1','2:1','3:1'],self.lookup,False))
        self.assertFalse(legal(['1:1','2:1','10:0','11:0'],self.lookup,False))
        self.assertFalse(legal(['10:0','11:0','12:0'],self.lookup,False))
        self.assertTrue(legal(['1:1','2:1','10:0'],self.lookup,False))

    def test_budget_locks_levels_and_seed_distance(self):
        scored=[]
        def scorer(decks):
            scored.extend(decks)
            return [.5+sum(c['key']=='16:0' for c in d['cards'])*.1 for d in decks]
        result=self.engine.search(scorer,locked=['1:1'],level=14,tower_id=1,budget=128)
        self.assertLessEqual(result['evaluated'],128)
        self.assertEqual(result['evaluated'],len(scored))
        self.assertTrue(result['candidates'])
        for d in scored:
            self.assertTrue(legal([c['key'] for c in d['cards']],self.lookup))
            self.assertIn('1:1',[c['key'] for c in d['cards']])
            self.assertTrue(all(c['level']==14 for c in d['cards']))
        for c in result['candidates']:
            self.assertLessEqual(len(set(c['keys'])-set(c['seed_keys'])),2)
        for a,b in zip(result['candidates'],result['candidates'][1:]):
            self.assertGreaterEqual(len(set(a['keys'])-set(b['keys'])),2)

    def test_invalid_locks_and_no_fit(self):
        with self.assertRaises(ValueError): self.engine.search(lambda _:[],locked=['1:0','1:1'])
        with self.assertRaises(ValueError): self.engine.search(lambda _:[],min_elixir=6,max_elixir=7)


if __name__=='__main__': unittest.main()
