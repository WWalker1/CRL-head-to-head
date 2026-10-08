# Benchmark results

Bundle `20260921T223438Z`; local CPU, torch threads 2; 5 warm rounds. Measurements exclude network startup.

| operation | p50 ms | p95 ms | evaluated/pairs |
|---|---:|---:|---:|
| single predict | 0.7 | 0.8 | 1 |
 | counter search (budget 512) | 103.4 | 103.7 | 512/512 |
 | complete meta search (budget 512) | 538.1 | 594.3 | 512/4896 |

 Search uses complete decks, bounded candidates/deadlines and batched CPU inference. Results are model estimates, not measured win rates or global optima.
 Batch sizes 1/32/128/512 measured {1: 1.749500006553717, 32: 3.098200002568774, 128: 9.274900003219955, 512: 41.79119999753311}; concurrency load was not run in-process because the service gate serializes jobs by design.
