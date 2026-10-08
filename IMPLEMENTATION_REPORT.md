# Rival Royale implementation report

Updated October 7, 2026. Read `LAUNCH_HANDOFF_2026-10-07.md` first for the release checklist.

## Delivered in the beta

- Mobile-first friend tracking with existing win/loss aggregates, most-played friend decks, a full friend deck page, and counter suggestions.
- Visual complete-deck matchup and counter finder with example decks, card search, optional level controls, and Clash Royale export links for generated counter decks.
- Separate tracking, counter finder, and player skill entry pages. The iterative deck completer is tabled and not part of launch.
- Latest-100 eligible full-match retention for each tracked subject, plus compact cumulative deck counts and top-five decks since tracking began. Eligible constructed 1v1 includes Classic and Grand Challenge; altered/draft modes are excluded.
- Model-relative matchup skill, best tough win, and toughest favored loss for the signed-in player. Friend skill badges exist; the full friend skill view still needs to match the signed-in player's layout.
- Anonymous rate limits including three free counter searches per visitor per day, authenticated quotas, a 15-friend cap, and revocable rivalry share snapshots.
- Existing Supabase migrations 007–012, Railway CPU model service, protected Vercel Preview, and public beta at https://beta.rival-royale.com. The old protected branch Preview has a stale Railway token and should not be sent to testers.

## Deployment state

The beta branch was pushed at `cf5e269`. Production `main` includes history/cron fixes at `c82ace5` but does not yet include the beta UI. The live Vercel nightly cron must stay enabled; the separate local research ingestion is paused. The user approved production promotion after tests and launch checks pass. See `DEPLOYMENT_SETUP.md` for environment and project separation.

## Verification status and remaining work

The beta branch had 141 passing JavaScript tests and a passing TypeScript/production build at `cf5e269`. Rerun after edits; these are prior results, not a launch guarantee. Public beta catalog and example APIs returned HTTP 200 on October 7. A prior production manual cron pass captured 641 new battles and succeeded for 1,154/1,159 users; retry and logging fixes were subsequently pushed, so a fresh cron run is required. Row caps previously measured at 31 and 37 in sampled relationships, below the 100 limit. Verify the real production deployment, scheduled run, friend win/loss continuity, complete signed-in and mobile flows, card art, and Railway spend before promotion.

The next UI changes are to hide the raw model build ID in public stats, open a tracked friend's skill using the same full score UI as the player's own, and add concise search-intent copy about being good at Clash Royale and comparing friends. Draft Reddit launch posts, but do not publish. The primary release blocker would be a failed cron/history or win/loss continuity check, failing tests, inaccessible friend skill data, broken mobile flow, or invalid model service credentials.

The model estimates are predictions, not measured deck win rates or a pure player-skill rating. Counter search ranks a bounded candidate set, not every possible deck. Preserve those factual limits in product claims without filling primary screens with caveats.
