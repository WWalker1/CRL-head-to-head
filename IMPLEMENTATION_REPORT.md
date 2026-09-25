# Local beta handoff — 2026-09-23

Branch: codex/rival-model-product. No deployment or live Supabase migration.

## Delivered
- Real calibrated two-layer attention inference behind an authenticated Next.js proxy and a CPU Python service.
- Matchup, counter finder, deck builder and methodology pages with metadata.
- Bounded seed repair and card replacement search. Every selected builder card is mandatory, including its Evolution/Hero form. All candidates are checked; invalid completions are rejected rather than displayed.
- Friend-history normalization, deduplication and latest-100 view; top-three frequency-weighted opponent support; private owner access and revocable rivalry share snapshots with social images.
- Portable checkpoint bundle, hash validation, service token, single-job concurrency gate, request-size limits, database quota migration and local launcher.

## Validation
Production build succeeds. Python service: 8 tests pass, including checkpoint parity, swap/permutation invariance, legality and every returned candidate preserving four required cards. Browser verified real prediction and three completions each preserving Hog Rider, Musketeer, Fireball and Ice Spirit. Local timings are recorded in BENCHMARK_RESULTS.md (about 0.10s counter and 0.54s completion; hosted latency remains unmeasured).

Full application suite retains 12 existing failures in battleProcessor, userIsolation and add-friend tests; the new model, history and access tests pass. These failures were also present in the baseline and are not a claim that the entire suite is green.

## Remaining before production
Apply and validate migrations 007/008 in a development Supabase project; exercise signed-in history, quotas, sharing and revocation with real rows. History refresh is currently on demand; a scheduled history accumulator is not wired yet. Verify actual social previews and Railway container resources, cold starts and concurrency. The container configuration has not been built here. Models and data are ignored artifacts requiring separate distribution.

Search scores historical training opponents, not a live meta feed. Novel decks can exploit model errors; the search is heuristic, not exhaustive or globally optimal. No model retraining or new masked-card proposal model was performed during this implementation. An owned-card restriction UI remains future work.

See LOCAL_DEVELOPMENT.md for local preview and signed-in development instructions; IMPLEMENTATION_PLAN.md retains the larger design context.

## To-do status — paused at user request, 2026-09-24
- [x] Implement local model service and app pages.
- [x] Fix builder to preserve every selected card in every completion.
- [x] Verify real browser inference and four-card completion.
- [x] Pass production build, 8 Python service tests and 6 model UI/API tests.
- [x] Write local startup instructions and benchmark results.
- [ ] Validate migrations 007/008 and signed-in flows against a development Supabase project.
- [ ] Verify friend-history refresh, weighted counter requests, quotas, share revocation and social previews end to end.
- [ ] Wire scheduled accumulation of friend history toward 100 recorded matches.
- [ ] Build and test the Railway container, including cold starts and concurrency limits.
- [ ] Resolve 12 pre-existing application test failures before declaring the full suite green.
- [ ] Validate novel-deck recommendations for model exploitation and balance-change drift.
- [ ] Complete final review and deploy when ready; nothing has been deployed.

Optional follow-ups: owned-card/exclusion controls, deeper interpretability and a learned card proposal model. No further implementation is running on this task.
