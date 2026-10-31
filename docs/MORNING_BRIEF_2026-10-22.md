# Rival Royale: morning runs and current development

## Release status

No dev push or deployment has succeeded. Production main, production nightly schedule, stored records and paused research collectors are unchanged. Online main was checked again through GitHub on October 22: `c48fffba8f06b5c18956a2448f19d12e73a3697c`, matching this Windows checkout's base.

## What the two scheduled runs actually did

These findings come from the two Linear run reports, not an assumption that this checkout contains their work.

| Run | Completed | Verification | Where the work is |
| --- | --- | --- | --- |
| Earlier audit | Checked production canonical/robots/sitemap access, authenticated redirects and ads.txt; identified incomplete privacy disclosure | Public HTTP/crawlability checks; no new implementation | Linear continuation audit |
| Later coding | Bounded cron concurrency/admission, added pagination/scheduling tests, repaired lint tooling, researched captain-agent context and contracts | Reported 31 suites / 186 tests, TypeScript and optimized build passed; full lint still had 19 errors | Separate cloud checkout, branch `codex/morning-bounded-cron-20261022`, commit `0ee0a4cd238e421cb55a81f68ab180bac7e43b18`; not pushed or integrated here |

Timing correction: the execution records are around 06:05 and 11:39 UTC, approximately **2:05 a.m. and 7:39 a.m. Eastern daylight time**, rather than the requested 1 and 6:30 a.m. Eastern. No new wakeups were created in this session.

The cloud jobs could not see the unpublished Windows work. The available handoff tool explicitly does not support cloud handoff. Recover the later run's commit/patch before integrating its cron changes; do not recreate a competing cron implementation or assume its tests cover this working tree.

## What is now implemented in this Windows checkout

- Earlier mobile menu dismissal and stable deck slots are preserved.
- Three signed-out guide routes and the interactive score example are preserved.
- Public recent-player lookup is staged behind default-off `PUBLIC_PLAYER_LOOKUP_ENABLED=1`. It reads public battle logs rather than account archives, admits requests through existing shared quotas, bounds the window to 25 eligible decisive games, and submits one bounded deck-scoring batch. Service failures show a record without manufacturing a model score.
- Fixed an expired-request cache race; a late failure can no longer evict its newer replacement. Added a 25-second UI deadline, stricter request-shape validation, regression tests and input autocapture exclusion.
- Added lookup started/completed/failed events through the existing configured PostHog integration. Custom event payloads exclude player tags, scores, decks, error text and raw responses. No analytics service or consent configuration was provisioned or changed.
- Added `/about` and `/privacy`, global footer links, and sitemap entries. About links to the existing public GitHub issue tracker without inventing an email address. Privacy describes account data, game retention, optional public snapshots, sharing, analytics and optional advertising. Owner confirmation and a private contact/deletion process remain review gates.
- Homepage primary action leads to a public lookup when enabled, otherwise to free guides; tracking signup remains available. Disabled model tools are omitted from the homepage tool section.
- Repaired lint using ESLint's flat configuration and CLI. Fixed all 19 errors exposed by the repaired command without disabling rules: JSX punctuation, effect-driven state, render-time ref mutation. Player history refresh now clears prior results and ignores late old requests. The picker resets on reopen and uses the latest Escape callback. Fixed an unsupported route export found by TypeScript.

## Verification in this session

- Full Jest: **37 suites / 204 tests passed**, including stale-request, deadline, quota/privacy and card-picker lifecycle checks.
- TypeScript passed.
- Optimized `next build --webpack` passed for the substantive UI/privacy/runtime batch before the final analytics addition. Final-source build reruns failed on host filesystem `EPERM: operation not permitted, mkdir` in generated guide directories, both in `.next` and an isolated verification output directory. The final build is therefore **blocked**, not a current full pass. Temporary build-directory/TypeScript configuration changes were restored byte-for-byte; production infrastructure is unchanged. Final-source TypeScript, tests and lint passed independently.
- ESLint passes with **zero errors / nine warnings**. Remaining warnings concern three existing hook dependencies and six raw-image uses; no warnings were suppressed.
- Server startup reported ready on 127.0.0.1:3100. HTTP verification failed with the host socket access error, so there is **no new browser/end-to-end pass claim**. The temporary server was stopped. Use the documented persistent terminal launcher after local socket access is restored.
- Public lookup is not enabled broadly. Real-tag, deployed privacy/quota behavior, service latency and representative load checks remain mandatory.
- Updating Linear with this combined report and the public-lookup ticket comment was rejected by automatic approval review: it requires explicit permission to send internal implementation/release/access details to Linear. Neither write succeeded. Do not retry by changing destinations or tools; the local report remains available for review.

## Unblock publishing and integration

1. **Writable Git metadata:** run this checkout in a session that can write `.git`. Fetch currently fails with `cannot open '.git/FETCH_HEAD': Permission denied`. GitHub OAuth cannot fix this filesystem rule.
2. **GitHub repository write access:** the connected integration previously denied `POST /git/refs` with `403 Resource not accessible by integration`. Grant contents/ref write access to `WWalker1/CRL-head-to-head`, or provide a normally authenticated writable checkout. Read access works. Do not paste a token into chat.
3. **Vercel team access:** authorize the existing connection for `wwrens-projects-9530f2aa`, team `team_fABzweylokMn6qTACcenQB8h`, project `crl-head-to-head`. Its reported 403 is separate from owner authorization to upload source, which is already granted. Do not create a substitute project or alter production to bypass the denial.
4. **Recover the cloud commit:** export the later morning run's commit as a git patch/source artifact from that run. Integrate only after comparing it against these local changes. Lint repair overlaps; cron source does not yet exist here.
5. **Local browser access:** run `scripts/start-web-preview.ps1` from a normal persistent local terminal or restore the app's local-browser bridge. This session can start a server but cannot verify loopback requests.
6. **Build output access:** restore normal directory creation for generated Next.js output. Final build reruns fail with `EPERM ... mkdir` in guide output directories. Run the final optimized build in the writable normal development session before release.
7. **Linear report authorization:** explicitly authorize posting this report and implementation/release/access-status updates to the Rival Royale Linear project. Automatic approval review rejected those writes despite the earlier general authorization; no Linear update from this continuation succeeded.

## Owner validation after access is restored

- Choose a private support/deletion contact channel and confirm privacy statements against actual hosting, analytics, advertising/consent settings and retention practices. The public issue tracker is for non-sensitive feedback.
- Walk through mobile menu/card picker and the guides; test several known player tags in a dev preview with explicit lookup flag enabled.
- Review score interpretation and sample labels. Do not market a provisional deck-relative score as a global skill percentile.
- Verify AdSense and Search Console account state before requesting review. Technical crawlability does not establish Google indexing or approval.

## Work that is still open

Cloud cron integration and completion/fairness measurements; inactive-account scheduling; compute-cost measurements; two-player comparison using a consistent model/window; public score-card sharing; last-opponent deck import; weekly recap; curated search pages based on actual queries; creator pilot; final dev/browser/load verification. These are not marked completed merely because a roadmap exists. Infrastructure migration and ad experiments should follow measurements and a working release.

## Evidence

- [Earlier run audit](https://linear.app/wwrens-roost/document/continuation-audit-and-missing-working-tree-blocker-october-22-2026-4ca370a82a57)
- [Later run report](https://linear.app/wwrens-roost/document/morning-brief-bounded-cron-captain-context-and-remaining-gates-october-99065706489f)
- [Growth roadmap](https://linear.app/wwrens-roost/document/growth-roadmap-traffic-repeat-visits-and-ad-revenue-dd0e32098bf4)
- [Google required advertising disclosures](https://support.google.com/adsense/answer/1348695?hl=en)
- [Google advertising cookies](https://support.google.com/adsense/answer/7549925?hl=en)

See `ACCESS_BLOCKERS_2026-10-22.md` for original denial evidence and `DEV_ROLLOUT_2026-10-21.md` for the earlier module acceptance checks.
