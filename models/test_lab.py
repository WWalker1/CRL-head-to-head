import copy
import unittest
import numpy as np
import torch
from attention_data import MatchupAttention, INPUT_KEYS
from mode_policy import classify
from test_prepare_data import fixture
from train import metrics


class LabTests(unittest.TestCase):
    def test_auc_ties_and_chance(self):
        y=np.array([0,0,1,1])
        self.assertEqual(metrics(np.zeros(4),y)['auc'],.5)
        self.assertEqual(metrics(np.array([-2,-1,1,2]),y)['auc'],1)
        self.assertEqual(metrics(np.zeros(4),y)['brier'],.25)

    def test_modes_fail_closed(self):
        b=fixture()
        self.assertEqual(classify(b),'ultimate_champion_ranked')
        b['leagueNumber']=5
        self.assertEqual(classify(b),'grand_champion_ranked')
        b['gameMode']={'id':72000512,'name':'Chaos_1v1_MegaDraft_All'}
        self.assertEqual(classify(b),'modified_or_other_rules')
        b['gameMode']={'id':72000042,'name':'PickMode'}; b['type']='friendly'; b['deckSelection']='pick'
        self.assertEqual(classify(b),'draft_research_only')
        b['modifiers']=['altered_card']
        self.assertEqual(classify(b),'modified_or_other_rules')
        b['modifiers']=[]; b['gameMode']={'id':1,'name':'Touchdown_Draft'}
        self.assertEqual(classify(b),'modified_or_other_rules')

    def test_trace_is_real_and_joint_forms_distinct(self):
        torch.manual_seed(10); torch.set_num_threads(2)
        model=MatchupAttention(12,4).eval()
        batch={'card_ids':torch.randint(2,12,(2,2,8)), 'form_ids':torch.zeros(2,2,8,dtype=torch.long),
               'card_numeric':torch.rand(2,2,8,5), 'tower_ids':torch.full((2,2),2,dtype=torch.long),
               'tower_level':torch.ones(2,2),'starting_rating':torch.rand(2,2)}
        with torch.no_grad():
            plain=model(batch); traced,details=model(batch,trace=True)
            self.assertTrue(torch.allclose(plain,traced,atol=1e-6))
            self.assertTrue(torch.allclose(details['cross_ab'].sum(-1),torch.ones(2,4,9),atol=1e-6))
            reverse={k:v.flip(1) for k,v in batch.items()}
            self.assertTrue(torch.allclose(plain,-model(reverse),atol=1e-6))
            changed=copy.deepcopy(batch); changed['starting_rating']+=100
            self.assertTrue(torch.allclose(plain,model(changed),atol=1e-6))
            self.assertFalse(torch.equal(model.cards.weight[8],model.cards.weight[9]))


if __name__=='__main__': unittest.main()
