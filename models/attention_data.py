"""PyTorch dataset and matchup attention architecture. train.py saves learned models."""
import argparse
import json
from pathlib import Path
import numpy as np
import torch
from torch import nn
from torch.utils.data import Dataset, DataLoader
from collect import ROOT

INPUT_KEYS = ('card_ids', 'form_ids', 'card_numeric', 'tower_ids', 'tower_level', 'starting_rating')


class MatchDataset(Dataset):
    def __init__(self, path):
        with np.load(path, allow_pickle=False) as data:
            self.data = {key:torch.from_numpy(data[key].copy()) for key in (*INPUT_KEYS, 'label', 'weight')}

    def __len__(self):
        return len(self.data['label'])

    def __getitem__(self, index):
        return {key:value[index] for key, value in self.data.items()}


class MatchupAttention(nn.Module):
    def __init__(self, cards, towers, width=64, layers=2):
        super().__init__()
        self.cards = nn.Embedding(cards*4, width, padding_idx=0)
        self.numeric = nn.Linear(5, width)
        self.towers = nn.Embedding(towers, width, padding_idx=0)
        self.context = nn.Linear(2, width)
        block = nn.TransformerEncoderLayer(width, 4, 128, dropout=0.0, batch_first=True)
        self.encoder = nn.TransformerEncoder(block, layers)
        self.cross = nn.MultiheadAttention(width, 4, batch_first=True)
        self.head = nn.Sequential(nn.Linear(width*2, 64), nn.ReLU(), nn.Linear(64, 1))

    def forward(self, batch, trace=False):
        n = batch['card_ids'].shape[0]
        x = self.cards(batch['card_ids']*4+batch['form_ids']) + self.numeric(batch['card_numeric'])
        # Deck-only prediction: rating remains audit context, not a model shortcut.
        context = torch.stack([batch['tower_level'], torch.zeros_like(batch['starting_rating'])], dim=-1)
        tower = self.towers(batch['tower_ids']) + self.context(context)
        x = torch.cat([x, tower.unsqueeze(2)], dim=2).reshape(n*2, 9, -1)
        embedded = x
        self_weights = []
        for layer in self.encoder.layers:
            attended, weights = layer.self_attn(x,x,x,need_weights=trace,average_attn_weights=False)
            x = layer.norm1(x+layer.dropout1(attended))
            x = layer.norm2(x+layer.dropout2(layer.linear2(layer.dropout(layer.activation(layer.linear1(x))))))
            if trace: self_weights.append(weights.reshape(n,2,4,9,9))
        encoded = x.reshape(n, 2, 9, -1)
        a, b = encoded[:,0], encoded[:,1]
        cross_ab, weights_ab = self.cross(a,b,b,need_weights=trace,average_attn_weights=False)
        cross_ba, weights_ba = self.cross(b,a,a,need_weights=trace,average_attn_weights=False)
        ab, ba = a+cross_ab, b+cross_ba
        a, b = ab.mean(1), ba.mean(1)
        logits = (self.head(torch.cat([a,b], -1))-self.head(torch.cat([b,a], -1))).squeeze(-1)
        if trace:
            return logits, {'self_attention':self_weights, 'cross_ab':weights_ab,'cross_ba':weights_ba,
                            'embeddings':embedded.reshape(n,2,9,-1), 'pooled':torch.stack([a,b],dim=1)}
        return logits


def smoke(directory):
    torch.manual_seed(42)
    torch.set_num_threads(2)
    vocab = json.loads((directory/'vocabulary.json').read_text())
    dataset = MatchDataset(directory/'train.npz')
    batch = next(iter(DataLoader(dataset, batch_size=32, shuffle=False)))
    model = MatchupAttention(len(vocab['cards'])+2, len(vocab['towers'])+2)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)
    logits = model(batch)
    loss = (nn.functional.binary_cross_entropy_with_logits(logits, batch['label'], reduction='none')*batch['weight']).sum()/batch['weight'].sum()
    loss.backward()
    assert torch.isfinite(loss) and all(torch.isfinite(p.grad).all() for p in model.parameters() if p.grad is not None)
    optimizer.step()
    model.eval()
    with torch.no_grad():
        logits = model(batch)
        swapped = {k:v.flip(1) if k in INPUT_KEYS else v for k,v in batch.items()}
        swap_error = float((logits+model(swapped)).abs().max())
        permuted = dict(batch)
        permutation = torch.randperm(8)
        for k in ('card_ids','form_ids','card_numeric'):
            permuted[k] = batch[k][:,:,permutation]
        permutation_error = float((logits-model(permuted)).abs().max())
    assert swap_error < 1e-5 and permutation_error < 1e-5
    result = {'batch_size':len(batch['label']), 'finite_backward_pass':True,
              'swap_logit_error':swap_error, 'permutation_error':permutation_error,
              'parameters':sum(p.numel() for p in model.parameters()), 'trained_predictor':False}
    (directory/'attention-smoke.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(result))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--directory', type=Path)
    args = parser.parse_args()
    directory = args.directory or Path(json.loads((ROOT/'data/training/latest.json').read_text())['directory'])
    smoke(directory)
