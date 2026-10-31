# October 31 refresh, retention and release status

## Dev release completed

At the owner's subsequent explicit request, published the available Windows source to `dev` and deployed the existing public beta project. Deployment `dpl_7GvZL6rCsGp5GJJBeqEA9k1gaDFM` is READY at https://beta.rival-royale.com from commit `656c52dc1b25da54e5a2118baa462cb47c773585`. Start at `/dev-review` for twelve numbered areas with test steps, or read `docs/DEV_REVIEW_2026-10-31.md` for the full source/review mapping. Beta's lookup/model/history/review flags are enabled; its canonical/share origin is the public beta domain. No credential values were exposed or replaced.

Beta uses a no-cron `vercel.json`; this differs intentionally from the untouched local/main production config. Fetch and restore the main production cron config when promoting application changes. Main remains `c48fffba8f06b5c18956a2448f19d12e73a3697c`. The cloud cron source is explicitly excluded and labeled in the review hub. Vercel cloud builds now pass; historical local EPERM remains a local-host issue. Public route/model HTTP checks, signed-out redirect and browser review-hub rendering passed. Signed-in mutations, real-device export and representative lookup/load checks are still owner acceptance items.

## GitHub reconnection follow-up

All 122 changed/new/deleted source entries were successfully committed and pushed to `codex/production-refresh-retention-20261031` at `86e2fe5b0eaa33e1829a9790f472eb9692313037`. This includes the prior unpublished Windows changes, fonts/licenses, source tests, access skill and applied database migration; credential-pattern scanning found no matching secrets. Main was not advanced. This push is source preservation, not a verified development or production release. No Vercel deployment was found for this SHA immediately after the push. The next agent can retrieve this snapshot from GitHub instead of depending on this Windows working tree.

The owner installed ChatGPT Codex Connector during this session. Creating branch `codex/production-refresh-retention-20261031` from verified main now succeeds. GitHub write authorization is restored; the earlier 403 evidence below is historical. Local Git metadata is still read-only. Main remains unchanged while preparing the combined source snapshot. The separate cloud branch is absent from GitHub; its Linear report confirms that it was never pushed. Task discovery still fails, so the original cloud commit has not been recovered.

## Live database changes completed

Owner requested about twenty rapid Sync Battles operations and fifty retained games per subject, plus publication of all recent website changes. This supersedes older latest-100 retention instructions.

Supabase project `tzttcfxdgcfaksfyqmit` has migration `20261031015742_refresh_burst_20_and_history_retention_50`. The migration filename uses the exact version returned by the live migration history. The local Supabase CLI was absent and npm installation failed with DNS ENOTFOUND; the connected migration tool applied the reviewed SQL instead.

- Account budget: twenty completed operations per UTC minute across sync, friend refresh, add friend and validation. A sync still reserves sixteen upstream calls. User/address/global weighted limits are 320/640/1920 calls per minute for authenticated work; anonymous validation keeps its 60-call address cap. Daily limits are 3200/6400/10000 calls. Active request leases remain required; overlapping refreshes are rejected. The old account cooldown is removed. Other model/counter quotas are unchanged.
- Both full-history tables retain the newest fifty rows, ordered by battle time then ID. Existing excess rows were pruned: 30,361 player rows and 18,193 friend rows. Final counts: 53,162 player and 40,783 friend rows; maximum per subject verified as fifty.
- Lifetime friend totals remained 46,338 wins and 35,668 losses. Both lifetime captured-match and deck-summary counts remained 220,740.
- Executed table-by-table FULL/ANALYZE maintenance with SKIP_LOCKED after pruning, retrying the skipped friend table once idle. Verified total database size fell from 444 MB to 279 MB; player history from 219 MB to 115 MB and friend history from 150 MB to 89 MB. Do not repeatedly vacuum on resume.
- SQL rollback tests passed before application: twenty admitted syncs, denial of twenty-first operation across address/endpoint changes, lease protection, minute reset, daily/global budget enforcement, service-only RPC access, fifty-row retention and newest-row ordering, exact lifetime/deck counts, unchanged friend records. Tests are in `supabase/tests/refresh_and_retention.sql`; wrap in BEGIN/ROLLBACK when rerunning.

## Source verification and publication

Online main was independently verified through GitHub at `c48fffba8f06b5c18956a2448f19d12e73a3697c`, matching local HEAD. Git fetch fails because `.git/FETCH_HEAD` is read-only. All pre-existing unpublished Windows work was preserved. New application edits use a shared fifty-game constant in history reads/summaries, player stats, retention warnings and rivalry snapshots; public explanatory/privacy copy reflects fifty games.

- All 48 Jest suites / 245 tests passed with an explicitly writable cache under `C:/Users/22wes/AppData/Local/Temp/rr-jest-20261031`.
- TypeScript passed. Lint passed with six existing image warnings. Whitespace check passed.
- After the final shared-constant/rivalry-query edit, TypeScript and six affected suites / 28 tests passed again.
- Optimized Webpack build remains blocked by host EPERM creating `.next/server/app/api`. No current successful production build or new signed-in/browser QA claim.
- Vercel project read now succeeds for production `crl-head-to-head`, project `prj_4s2sE0ZLnhhfkyzs7qgtvjHtjIgU`, team `team_fABzweylokMn6qTACcenQB8h`.
- GitHub branch creation still returns 403 `Resource not accessible by integration`. No new source commit, main push, or website deployment succeeded. Owner is repairing the GitHub installation; their screenshot showed no ChatGPT/Codex app under installed GitHub apps. Directed owner to the official `chatgpt-codex-connector` installation page, personal account WWalker1 and repository CRL-head-to-head. Verify an actual write after reconnection rather than relying on repository permission metadata.
- Separate cloud commit `0ee0a4cd238e421cb55a81f68ab180bac7e43b18` is absent locally and GitHub returns 422 for it. App task-list discovery failed. Recovery/reconciliation remains required by AGENTS.md before a combined website release; do not silently recreate competing cron changes.

Production already benefits from the live database refresh/retention changes. Its frontend is still the old main deployment and can display the old hundred-game wording until publication succeeds. Production nightly cron configuration was untouched; no collectors or manual sync were started. Public lookup remains under its existing feature flag.

Resume with GitHub write verification, cloud-commit recovery, a successful optimized build and relevant preview/signed-in checks, then release reconciled source to main and verify deployed SHA and production cron. Existing Supabase advisor findings were inspected; unrelated security changes were not included in this release.
