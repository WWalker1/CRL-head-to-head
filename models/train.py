"""Train baselines and deck-only attention; select on validation, calibrate, test once."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import random
import time
import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, Subset
from attention_data import MatchDataset, MatchupAttention
from collect import ROOT


class LinearMatchup(nn.Module):
    def __init__(self,cards,towers):
        super().__init__()
        self.card = nn.Embedding(cards*4,1)
        self.tower = nn.Embedding(towers,1)
        self.level = nn.Linear(2,1,bias=False)
        nn.init.zeros_(self.card.weight); nn.init.zeros_(self.tower.weight); nn.init.zeros_(self.level.weight)

    def forward(self,b):
        score = self.card(b['card_ids']*4+b['form_ids']).sum(2).squeeze(-1)+self.tower(b['tower_ids']).squeeze(-1)
        context=torch.stack([b['card_numeric'][:,:,:,0].mean(2),b['tower_level']],-1)
        score=score+self.level(context).squeeze(-1)
        return score[:,0]-score[:,1]


class RatingOnly(nn.Module):
    def __init__(self):
        super().__init__(); self.scale=nn.Parameter(torch.zeros(1))
    def forward(self,b):
        return (b['starting_rating'][:,0]-b['starting_rating'][:,1])*self.scale


def metrics(logits,y,temperature=1):
    z=np.clip(np.asarray(logits,dtype=np.float64)/temperature,-40,40)
    prob=1/(1+np.exp(-z)); y=np.asarray(y)
    # Average ranks for ties: Mann–Whitney AUC.
    order=np.argsort(prob,kind='stable'); sorted_p=prob[order]; rank=np.empty(len(y),float)
    starts=np.r_[0,np.flatnonzero(np.diff(sorted_p))+1]; ends=np.r_[starts[1:],len(y)]
    for start,end in zip(starts,ends): rank[order[start:end]]=(start+1+end)/2
    pos=y.sum(); neg=len(y)-pos
    auc=(rank[y==1].sum()-pos*(pos+1)/2)/(pos*neg) if pos and neg else None
    bins=[]; ece=0
    for i in range(10):
        mask=(prob>=i/10)&(prob<(i+1)/10 if i<9 else prob<=1)
        if mask.any():
            p=float(prob[mask].mean()); rate=float(y[mask].mean()); size=int(mask.sum())
            bins.append({'lo':i/10,'hi':(i+1)/10,'count':size,'predicted':p,'observed':rate})
            ece+=size/len(y)*abs(p-rate)
    predicted=(prob>=.5).astype(int)
    return {'rows':len(y),'accuracy':float((predicted==y).mean()),
            'log_loss':float(np.mean(np.logaddexp(0,z)-y*z)), 'brier':float(np.mean((prob-y)**2)),
            'auc':float(auc) if auc is not None else None,'ece':ece,'calibration_bins':bins,
            'confusion':{'tn':int(((predicted==0)&(y==0)).sum()),'fp':int(((predicted==1)&(y==0)).sum()),
                         'fn':int(((predicted==0)&(y==1)).sum()),'tp':int(((predicted==1)&(y==1)).sum())}}


def predict(model,loader):
    model.eval(); preds=[]; labels=[]
    with torch.no_grad():
        for b in loader: preds.append(model(b).numpy()); labels.append(b['label'].numpy())
    return np.concatenate(preds),np.concatenate(labels)


def fit(model,train_loader,val_loader,epochs,lr,out,name):
    optimizer=torch.optim.AdamW(model.parameters(),lr=lr,weight_decay=.01)
    best_loss=float('inf'); best=None; history=[]; stale=0
    for epoch in range(1,epochs+1):
        started=time.time(); model.train(); total=weight_sum=0
        for b in train_loader:
            optimizer.zero_grad(set_to_none=True)
            logits=model(b)
            losses=nn.functional.binary_cross_entropy_with_logits(logits,b['label'],reduction='none')
            loss=(losses*b['weight']).sum()/b['weight'].sum()
            loss.backward(); nn.utils.clip_grad_norm_(model.parameters(),1); optimizer.step()
            total+=float((losses.detach()*b['weight']).sum()); weight_sum+=float(b['weight'].sum())
        logits,y=predict(model,val_loader); result=metrics(logits,y)
        row={'epoch':epoch,'train_weighted_log_loss':total/weight_sum,'validation_log_loss':result['log_loss'],
             'validation_accuracy':result['accuracy'],'seconds':round(time.time()-started,2)}
        history.append(row); print(json.dumps(dict(model=name,**row)),flush=True)
        (out/(name+'-history.json')).write_text(json.dumps(history,indent=2),encoding='utf-8')
        if result['log_loss']<best_loss-1e-5:
            best_loss=result['log_loss']; best=copy.deepcopy(model.state_dict()); stale=0
        else: stale+=1
        if stale>=3: break
    model.load_state_dict(best)
    return history


def grouped_ci(correct,player_hashes):
    # Both sides as grouping units: report the wider marginal percentile interval.
    intervals=[]
    for side in range(2):
        _,group=np.unique(player_hashes[:,side],return_inverse=True)
        sums=np.bincount(group,weights=correct); counts=np.bincount(group)
        rng=np.random.default_rng(42); samples=[]
        for _ in range(500):
            picked=rng.integers(0,len(counts),len(counts))
            samples.append(sums[picked].sum()/counts[picked].sum())
        intervals.append(np.quantile(samples,[.025,.975]))
    return [float(min(v[0] for v in intervals)),float(max(v[1] for v in intervals))]


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--directory',type=Path)
    p.add_argument('--epochs',type=int,default=30,
                   help='Maximum attention epochs; validation log loss early-stops after three stale epochs')
    p.add_argument('--threads',type=int,default=6)
    p.add_argument('--layers',type=int,choices=(2,4,6),default=2)
    p.add_argument('--only-attention',action='store_true')
    p.add_argument('--no-promote',action='store_true')
    args=p.parse_args()
    torch.manual_seed(42); np.random.seed(42); random.seed(42); torch.set_num_threads(args.threads)
    directory=args.directory or Path(json.loads((ROOT/'data/training/latest.json').read_text())['directory'])
    vocab=json.loads((directory/'vocabulary.json').read_text()); manifest=json.loads((directory/'manifest.json').read_text())
    out=ROOT/'data/runs'/time.strftime('%Y%m%dT%H%M%SZ',time.gmtime()); out.mkdir(parents=True)
    train=MatchDataset(directory/'train.npz'); val=MatchDataset(directory/'validation.npz'); test=MatchDataset(directory/'test.npz')
    with np.load(directory/'validation.npz') as data:
        times=data['timestamp']; calibration_start=times[len(times)//2]
        vi=np.flatnonzero(times<calibration_start); ci=np.flatnonzero(times>=calibration_start)
    if len(vi)==0 or len(ci)==0: raise RuntimeError('Cannot split validation from calibration')
    train_loader=DataLoader(train,batch_size=512,shuffle=True,generator=torch.Generator().manual_seed(42))
    val_loader=DataLoader(Subset(val,vi.tolist()),batch_size=512)
    calibration_loader=DataLoader(Subset(val,ci.tolist()),batch_size=512)
    test_loader=DataLoader(test,batch_size=512)
    report={'dataset':str(directory),'source_sha256':manifest['source_sha256'],'seed':42,
            'split_counts':{'train':len(train),'validation':len(vi),'calibration':len(ci),'test':len(test)},
            'split_policy':'Chronological; validation selects epochs; separate later calibration window sets temperature; test evaluated after selection.',
            'data_manifest':manifest,'models':{},'feature_policy':'Main model is deck-only: card/form, level, elixir and tower troop; rating is excluded.',
            'limitations':['Observational outcomes, not causal deck advantage','Short temporal window across selected Ranked leagues; not validated for draft or future patches',
                           'Player-cluster intervals are approximate marginal bootstrap bounds, not complete dyadic dependence correction',
                           'Attention weights are learned associations, not causal explanations']}
    configs=[('rating_only',RatingOnly(),8,.03),('card_linear',LinearMatchup(len(vocab['cards'])+2,len(vocab['towers'])+2),10,.015),
             ('attention',MatchupAttention(len(vocab['cards'])+2,len(vocab['towers'])+2,layers=args.layers),args.epochs,.0006)]
    if args.only_attention: configs=[c for c in configs if c[0]=='attention']
    trained=[]
    for name,model,epochs,lr in configs:
        history=fit(model,train_loader,val_loader,epochs,lr,out,name)
        logits,y=predict(model,calibration_loader)
        grid=np.exp(np.linspace(np.log(.25),np.log(5),100))
        losses=[float(np.mean(np.logaddexp(0,logits/t)-y*logits/t)) for t in grid]
        temperature=float(grid[int(np.argmin(losses))])
        torch.save({'state_dict':model.state_dict(),'temperature':temperature,'cards':len(vocab['cards'])+2,
                    'towers':len(vocab['towers'])+2,'dataset':str(directory),'name':name,'layers':args.layers if name=='attention' else None},out/(name+'.pt'))
        report['models'][name]={'history':history,'temperature':temperature,'parameters':sum(p.numel() for p in model.parameters()),'layers':args.layers if name=='attention' else None,
                                'best_epoch':min(history,key=lambda h:h['validation_log_loss'])['epoch']}
        trained.append((name,model,temperature))
    # No test values consulted until all model choices and temperatures are frozen.
    with np.load(directory/'test.npz') as d:
        test_y=d['label']; hashes=d['player_hash'].copy(); ids=d['match_id'].copy()
        test_leagues=d['league_number'].copy() if 'league_number' in d.files else np.full(len(test_y), 7, dtype=np.int8)
    report['models']['chance']={'test':metrics(np.zeros(len(test_y)),test_y)}
    majority=float(train.data['label'].mean()); logit=np.log(majority/(1-majority))
    report['models']['training_prior']={'test':metrics(np.full(len(test_y),logit),test_y)}
    for name,model,temperature in trained:
        logits,y=predict(model,test_loader)
        result=metrics(logits,y,temperature)
        result['accuracy_player_cluster_95pct']=grouped_ci((logits>=0)==y,hashes)
        result['test_by_league'] = {
            str(league): metrics(logits[test_leagues == league], y[test_leagues == league], temperature)
            for league in (5, 6, 7) if np.any(test_leagues == league)
        }
        report['models'][name]['test']=result
        report['models'][name]['uncalibrated_test']=metrics(logits,y)
        np.savez_compressed(out/(name+'-test-predictions.npz'),logits=logits,labels=y,match_id=ids)
    (out/'metrics.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    (out/'vocabulary.json').write_text(json.dumps(vocab,indent=2),encoding='utf-8')
    pointer=ROOT/'data/runs'/('latest-experimental.json' if args.no_promote else 'latest.json'); pointer.write_text(json.dumps({'directory':str(out.resolve())}),encoding='utf-8')
    print(json.dumps({'run':str(out),'test_results':{k:v['test'] for k,v in report['models'].items()}}),flush=True)


if __name__=='__main__': main()
