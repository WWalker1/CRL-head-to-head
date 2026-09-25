"""Measured CPU benchmark for prediction and bounded DeckSearch."""
import argparse,json,time,statistics
from pathlib import Path
from service.model import Runtime
from service.search import DeckSearch
def main():
 p=argparse.ArgumentParser(); p.add_argument('--bundle',default='models/data/bundle'); p.add_argument('--rounds',type=int,default=5); p.add_argument('--output',default='BENCHMARK_RESULTS.md'); a=p.parse_args(); b=Path(a.bundle); r=Runtime(b); ex=json.loads((b/'examples.json').read_text())[0]['decks']; s=DeckSearch(r); r.predict(ex)
 pred=[]
 for _ in range(a.rounds): t=time.perf_counter(); r.predict(ex); pred.append((time.perf_counter()-t)*1000)
 target=ex[1]; counter=[]; complete=[]; cr=cm={}
 for _ in range(a.rounds):
  t=time.perf_counter(); cr=s.run(target=target,budget=512,seconds=2.5); counter.append((time.perf_counter()-t)*1000)
  t=time.perf_counter(); cm=s.run(budget=512,seconds=2.5); complete.append((time.perf_counter()-t)*1000)
 def stats(x): return statistics.median(x),sorted(x)[max(0,int(len(x)*.95)-1)]
 p50,p95=stats(pred); c50,c95=stats(counter); m50,m95=stats(complete)
 batch_times={}
 for n in (1,32,128,512):
  pairs=[(ex[0],ex[1]) for _ in range(n)]; t=time.perf_counter(); r.predict_batch(pairs); batch_times[n]=(time.perf_counter()-t)*1000
 text=f'''# Benchmark results

Bundle `{r.manifest['model_id']}`; local CPU, torch threads 2; {a.rounds} warm rounds. Measurements exclude network startup.

| operation | p50 ms | p95 ms | evaluated/pairs |
|---|---:|---:|---:|
| single predict | {p50:.1f} | {p95:.1f} | 1 |
 | counter search (budget 512) | {c50:.1f} | {c95:.1f} | {cr.get('evaluated',0)}/{cr.get('pair_predictions',0)} |
 | complete meta search (budget 512) | {m50:.1f} | {m95:.1f} | {cm.get('evaluated',0)}/{cm.get('pair_predictions',0)} |

 Search uses complete decks, bounded candidates/deadlines and batched CPU inference. Results are model estimates, not measured win rates or global optima.
 Batch sizes 1/32/128/512 measured {batch_times}; concurrency load was not run in-process because the service gate serializes jobs by design.
'''; Path(a.output).write_text(text,encoding='utf-8'); print(text)
if __name__=='__main__': main()
