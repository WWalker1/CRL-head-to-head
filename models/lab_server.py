"""Local-only trained-model lab. No credentials, production routes or Supabase access."""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import traceback
from urllib.parse import urlparse
import torch

from collect import ROOT
from attention_data import MatchupAttention
from counter_search import CounterSearch, build_seeds


def tensorize(decks,catalog):
    if not isinstance(decks,list) or len(decks)!=2: raise ValueError('Choose two decks.')
    lookup={c['key']:c for c in catalog['variants']}; tower_lookup={c['id']:c for c in catalog['towers']}
    result={k:[] for k in ('card_ids','form_ids','card_numeric','tower_ids','tower_level','starting_rating')}
    names=[]; warnings=[]
    for i,deck in enumerate(decks):
        cards=deck.get('cards',[])
        if len(cards)!=8: raise ValueError(f'Deck {"AB"[i]} needs exactly eight cards.')
        enriched=[]
        for selection in cards:
            c=lookup.get(selection.get('key'))
            if c is None or not c['train_occurrences']: raise ValueError('A selected card form has no training support.')
            level=selection.get('level',16)
            if type(level) is not int or not c['min_level']<=level<=16: raise ValueError(f'Invalid level for {c["name"]}.')
            enriched.append((c,level))
        if len({c['card_id'] for c,_ in enriched})!=8: raise ValueError('A deck cannot include two forms of the same base card.')
        evos=sum(c['form']==1 for c,_ in enriched)
        heroes=sum(c['form']==2 or c['champion'] for c,_ in enriched)
        if evos>2 or heroes>2 or evos+heroes>3: raise ValueError('Ranked slots allow up to two Evolutions, two Heroes/Champions, and three special slots in total.')
        if any(c['train_occurrences']<1000 for c,_ in enriched): warnings.append(f'Deck {"AB"[i]} includes a form with fewer than 1,000 training appearances.')
        if any(level<15 for _,level in enriched): warnings.append(f'Deck {"AB"[i]} uses low levels outside the typical UC training range.')
        # Match preprocessing exactly.
        enriched.sort(key=lambda x:x[0]['card_id'])
        result['card_ids'].append([c['vocab_index'] for c,_ in enriched])
        result['form_ids'].append([c['form'] for c,_ in enriched])
        result['card_numeric'].append([[level/16,(c['elixir'] or 0)/10,float(c['elixir'] is not None),
                                        float(c['card_id']==28000006),float(c['form']!=0)] for c,level in enriched])
        tower=tower_lookup.get(deck.get('tower_id'))
        tl=deck.get('tower_level',16)
        if tower is None or not tower['train_occurrences'] or type(tl) is not int or not 1<=tl<=16:
            raise ValueError('Choose a supported tower troop and level from 1 to 16.')
        result['tower_ids'].append(tower['vocab_index']); result['tower_level'].append(tl/16)
        result['starting_rating'].append(0)
        names.append([c['name'] for c,_ in enriched]+[tower['name']])
    batch={k:torch.tensor([v],dtype=torch.long if k in ('card_ids','form_ids','tower_ids') else torch.float32) for k,v in result.items()}
    return batch,names,warnings


def main():
    p=argparse.ArgumentParser(); p.add_argument('--port',type=int,default=8766); args=p.parse_args()
    run=Path(json.loads((ROOT/'data/runs/latest.json').read_text())['directory'])
    checkpoint=torch.load(run/'attention.pt',map_location='cpu',weights_only=True)
    model=MatchupAttention(checkpoint['cards'],checkpoint['towers'],layers=checkpoint.get('layers',2)); model.load_state_dict(checkpoint['state_dict']); model.eval()
    torch.set_num_threads(2)
    directory=Path(checkpoint['dataset']); catalog=json.loads((directory/'card-catalog.json').read_text())
    examples=json.loads((directory/'examples.json').read_text()); metrics=json.loads((run/'metrics.json').read_text())
    seeds_path=directory/'search-seeds.json'
    seeds=json.loads(seeds_path.read_text()) if seeds_path.exists() else build_seeds(directory)
    searcher=CounterSearch(catalog,seeds)
    gate=threading.Lock()
    class Handler(BaseHTTPRequestHandler):
        def send(self,status,payload,kind='application/json'):
            body=json.dumps(payload,allow_nan=False).encode() if kind=='application/json' else payload
            self.send_response(status); self.send_header('Content-Type',kind+'; charset=utf-8')
            self.send_header('Content-Length',str(len(body))); self.send_header('Cache-Control','no-store')
            self.send_header('X-Content-Type-Options','nosniff'); self.end_headers(); self.wfile.write(body)
        def do_GET(self):
            route=urlparse(self.path).path
            if route=='/api/catalog': self.send(200,catalog)
            elif route=='/api/examples': self.send(200,examples)
            elif route=='/api/metrics': self.send(200,metrics)
            elif route=='/api/comparison':
                path=run/'comparison.json'
                self.send(200,json.loads(path.read_text(encoding='utf-8-sig')) if path.exists() else {})
            elif route in ('/','/index.html'): self.send(200,(ROOT/'lab/index.html').read_bytes(),'text/html')
            elif route in ('/app.js','/style.css'):
                self.send(200,(ROOT/'lab'/route[1:]).read_bytes(),'text/javascript' if route.endswith('.js') else 'text/css')
            else: self.send(404,{'error':'Not found'})
        def do_POST(self):
            route=urlparse(self.path).path
            if route not in ('/api/predict','/api/counter'): return self.send(404,{'error':'Not found'})
            try:
                size=int(self.headers.get('Content-Length','0'))
                if not 0<size<=32768: raise ValueError('Invalid request size')
                body=json.loads(self.rfile.read(size))
                if route=='/api/counter':
                    target=body.get('target')
                    tensorize([target,target],catalog)
                    locked=body.get('locked',[])
                    if not isinstance(locked,list) or any(not isinstance(k,str) for k in locked): raise ValueError('Invalid locked cards.')
                    if len(locked)!=len(set(locked)): raise ValueError('Repeated locked card.')
                    def score(candidates):
                        batches=[tensorize([candidate,target],catalog)[0] for candidate in candidates]
                        batch={k:torch.cat([b[k] for b in batches]) for k in batches[0]}
                        return torch.sigmoid(model(batch)/checkpoint['temperature']).tolist()
                    with gate,torch.no_grad():
                        result=searcher.search(score,locked=locked,level=body.get('level',16),
                            tower_id=body.get('tower_id'),tower_level=body.get('tower_level',16),
                            min_elixir=float(body.get('min_elixir',2.5)),max_elixir=float(body.get('max_elixir',5)),budget=1536)
                    return self.send(200,result)
                batch,names,warnings=tensorize(body.get('decks'),catalog)
                support=[]
                for side,deck in enumerate(body['decks']):
                    keys={c['key'] for c in deck['cards']}
                    overlap=max((len(keys.intersection(seed['keys'])) for seed in seeds),default=0)
                    support.append({'nearest_frequent_training_deck_overlap':overlap})
                    if overlap<6:
                        warnings.append(f'Deck {"AB"[side]} shares only {overlap}/8 card forms with its nearest frequent training deck. Its estimate may not generalize reliably.')
                with gate,torch.no_grad():
                    logits,trace=model(batch,trace=True)
                    raw=float(torch.sigmoid(logits)[0]); prob=float(torch.sigmoid(logits/checkpoint['temperature'])[0])
                values={'self_attention':[v[0].tolist() for v in trace['self_attention']],
                        'cross_ab':trace['cross_ab'][0].tolist(),'cross_ba':trace['cross_ba'][0].tolist(),
                        'embeddings':trace['embeddings'][0,:,:,:8].tolist(),'pooled':trace['pooled'][0,:,:8].tolist()}
                self.send(200,{'probability_a':prob,'probability_b':1-prob,'raw_probability_a':raw,
                    'temperature':checkpoint['temperature'],'token_names':names,'trace':values,'warnings':warnings,'deck_support':support,
                    'context':'Deck-only Ranked estimate, conditional on a decisive match. Attention is not a causal explanation.'})
            except (ValueError,TypeError,KeyError,AttributeError) as error: self.send(400,{'error':str(error)})
            except Exception:
                traceback.print_exc(); self.send(500,{'error':'Prediction failed; see local server log.'})
        def log_message(self,*args): pass
    print(f'Rival Research Lab: http://127.0.0.1:{args.port}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()


if __name__=='__main__': main()
