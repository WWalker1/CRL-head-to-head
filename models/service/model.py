from pathlib import Path
import json, torch, hashlib
from functools import lru_cache
from torch import nn

class MatchupAttention(nn.Module):
    def __init__(self,cards,towers,width=64,layers=2):
        super().__init__(); self.cards=nn.Embedding(cards*4,width,padding_idx=0); self.numeric=nn.Linear(5,width); self.towers=nn.Embedding(towers,width,padding_idx=0); self.context=nn.Linear(2,width)
        block=nn.TransformerEncoderLayer(width,4,128,dropout=0.0,batch_first=True); self.encoder=nn.TransformerEncoder(block,layers); self.cross=nn.MultiheadAttention(width,4,batch_first=True); self.head=nn.Sequential(nn.Linear(width*2,64),nn.ReLU(),nn.Linear(64,1))
    def forward(self,batch,trace=False):
        n=batch['card_ids'].shape[0]; x=self.cards(batch['card_ids']*4+batch['form_ids'])+self.numeric(batch['card_numeric']); context=torch.stack([batch['tower_level'],torch.zeros_like(batch['starting_rating'])],-1); tower=self.towers(batch['tower_ids'])+self.context(context); x=torch.cat([x,tower.unsqueeze(2)],2).reshape(n*2,9,-1)
        weights=[]
        for layer in self.encoder.layers:
            attended,w=layer.self_attn(x,x,x,need_weights=trace,average_attn_weights=False); x=layer.norm1(x+layer.dropout1(attended)); x=layer.norm2(x+layer.dropout2(layer.linear2(layer.dropout(layer.activation(layer.linear1(x))))));
            if trace: weights.append(w.reshape(n,2,4,9,9))
        a,b=x.reshape(n,2,9,-1)[:,0],x.reshape(n,2,9,-1)[:,1]; ca,wa=self.cross(a,b,b,need_weights=trace,average_attn_weights=False); cb,wb=self.cross(b,a,a,need_weights=trace,average_attn_weights=False); a,b=a+ca,b+cb; a,b=a.mean(1),b.mean(1); logits=(self.head(torch.cat([a,b],-1))-self.head(torch.cat([b,a],-1))).squeeze(-1)
        return (logits,{'self_attention':weights,'cross_ab':wa,'cross_ba':wb}) if trace else logits

class Runtime:
    def __init__(self,bundle:Path):
        bundle=Path(bundle); self.manifest=json.loads((bundle/'bundle.json').read_text())
        for name,digest in self.manifest.get('files',{}).items():
            if hashlib.sha256((bundle/name).read_bytes()).hexdigest()!=digest: raise ValueError(f'Bundle hash mismatch: {name}')
        self.catalog=json.loads((bundle/'card-catalog.json').read_text()); self.lookup={c['key']:c for c in self.catalog['variants']}; self.towers={c['id']:c for c in self.catalog['towers']}; self.checkpoint=torch.load(bundle/'attention.pt',map_location='cpu',weights_only=True); self.temperature=float(self.checkpoint['temperature']); torch.set_num_threads(2); self.model=MatchupAttention(self.checkpoint['cards'],self.checkpoint['towers'],layers=self.checkpoint.get('layers',2)); self.model.load_state_dict(self.checkpoint['state_dict']); self.model.eval(); self.seeds=json.loads((bundle/'search-seeds.json').read_text()) if (bundle/'search-seeds.json').exists() else []
    def tensorize(self,decks):
        if not isinstance(decks,list) or len(decks)!=2: raise ValueError('Choose two decks.')
        out={k:[] for k in ('card_ids','form_ids','card_numeric','tower_ids','tower_level','starting_rating')}; names=[]; warnings=[]
        for i,d in enumerate(decks):
            cards=d.get('cards',[])
            if len(cards)!=8: raise ValueError(f'Deck {"AB"[i]} needs exactly eight cards.')
            selected=[]
            for s in cards:
                c=self.lookup.get(s.get('key')); level=s.get('level',16)
                if c is None or not c.get('train_occurrences'): raise ValueError('A selected card form has no training support.')
                if type(level) is not int or not c['min_level']<=level<=16: raise ValueError(f'Invalid level for {c["name"]}.')
                selected.append((c,level))
            if len({c['card_id'] for c,_ in selected})!=8: raise ValueError('A deck cannot include two forms of the same base card.')
            ev=sum(c['form']==1 for c,_ in selected); hero=sum(c['form']==2 or c['champion'] for c,_ in selected)
            if ev>2 or hero>2 or ev+hero>3: raise ValueError('Illegal special-slot combination.')
            if any(c['train_occurrences']<1000 for c,_ in selected): warnings.append(f'Deck {"AB"[i]} includes a low-support form.')
            selected.sort(key=lambda x:x[0]['card_id']); out['card_ids'].append([c['vocab_index'] for c,_ in selected]); out['form_ids'].append([c['form'] for c,_ in selected]); out['card_numeric'].append([[lv/16,(c['elixir'] or 0)/10,float(c['elixir'] is not None),float(c['card_id']==28000006),float(c['form']!=0)] for c,lv in selected]); tower=self.towers.get(d.get('tower_id')); tl=d.get('tower_level',16)
            if tower is None or not tower.get('train_occurrences') or type(tl) is not int or not 1<=tl<=16: raise ValueError('Choose a supported tower troop and level from 1 to 16.')
            out['tower_ids'].append(tower['vocab_index']); out['tower_level'].append(tl/16); out['starting_rating'].append(0); names.append([c['name'] for c,_ in selected]+[tower['name']])
        batch={k:torch.tensor([v],dtype=torch.long if k in ('card_ids','form_ids','tower_ids') else torch.float32) for k,v in out.items()}; return batch,names,warnings
    def predict(self,decks):
        b,n,w=self.tensorize(decks)
        with torch.inference_mode(): raw=self.model(b); prob=torch.sigmoid(raw/self.temperature).tolist()
        return {'probability_a':float(prob[0]),'probability_b':1-float(prob[0]),'raw_probability_a':float(torch.sigmoid(raw)[0]),'temperature':self.temperature,'model_version':self.manifest['model_id'],'token_names':n,'warnings':w,'context':'Deck-only Ranked estimate, conditional on a decisive match.'}
    @lru_cache(maxsize=4096)
    def _encoded_deck(self, canonical):
        deck = json.loads(canonical)
        batch, _, _ = self.tensorize([deck, deck])
        return {key: value[0, 0] for key, value in batch.items()}

    def predict_batch(self, pairs):
        if not pairs: return []
        def encoded(deck):
            canonical = dict(deck, cards=sorted(deck['cards'], key=lambda c: c['key']))
            return self._encoded_deck(json.dumps(canonical, sort_keys=True))
        sides = [[encoded(a), encoded(b)] for a, b in pairs]
        batch = {key: torch.stack([torch.stack([a[key], b[key]]) for a, b in sides]) for key in sides[0][0]}
        with torch.inference_mode():
            return [float(x) for x in torch.sigmoid(self.model(batch) / self.temperature).tolist()]
