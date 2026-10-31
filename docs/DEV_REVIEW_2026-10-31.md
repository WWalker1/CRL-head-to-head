# Dev review — October 31, 2026

Review hub: https://beta.rival-royale.com/dev-review

Source: `dev` in WWalker1/CRL-head-to-head. The public beta is manually deployed from this branch; pushing dev alone does not update its domain. Main is unchanged. The dev branch uses the no-cron beta `vercel.json`; restore the production nightly cron configuration when integrating changes into main.

The owner explicitly requested this dev release with labeled changes after GitHub write access was repaired. The separately unpublished cloud cron commit remains unavailable and is excluded from this review build. This is an explicit current-source dev review, not a claim that the cloud work was reconciled.

## Feature checklist

| Label | What changed | Review location | What to investigate |
| --- | --- | --- | --- |
| 01 | Warm visual design, local licensed fonts, new homepage/tool directory and compact navigation | `/`, `/tools`, all account pages | Desktop/phone spacing, legibility, touch targets, menu closes on navigation/outside click/Escape, no sideways scrolling |
| 02 | Two original guides and interactive score example | `/guides`, `/guides/matchup-skill`, `/guides/review-a-matchup` | Accuracy/usefulness; ten games, six wins and 70% expected wins should yield score 40 |
| 03 | Public recent-player lookup, bounded cache, deadline, privacy-conscious events and saved local tags | `/clash-royale-skill-score` | Real tags vs game logs, 25-game eligibility window, invalid/missing tags, unsupported model results, latency/errors and clear recent tags |
| 04 | Two-player public snapshot comparison with model/date/sample guards | `/compare-players` | Compatible coverage, insufficient samples, change a tag during loading, no unsupported overall-winner claim |
| 05 | Stable visual deck slots, improved keyboard picker, opponent import, explicit/cancellable counter generation | `/counter-deck`, `/matchup` | Card/form/level preservation, picker focus and Escape, target changes invalidate results, actual game export on phone |
| 06 | Refreshed account forms and win/loss-first friend dashboard; removed eager per-friend model fetches | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/dashboard` | Real sign-in/reset, friend tracking with a disposable account, mobile layout and record preservation |
| 07 | Direct rivalry actual-vs-expected analysis, latest friend-deck rematch shortcut and full deck page | Dashboard → friend deck page | Owner/friend perspective, current model/cutoff, small-sample language, rematch import and counter cancellation |
| 08 | Recorded-player/friend stats, tough wins/favored losses and trailing weekly recap | `/stats`, dashboard → friend history | Fifty-game window, current model, retained vs lifetime counts, honest truncated-week copy |
| 09 | Score-card preview with explicit copy/native-share/SVG download and local recent tags | Public lookup → share preview | Dismissal/focus, clipboard/download on phone, missing score; native social-platform SVG compatibility is unverified |
| 10 | About/privacy pages, footer links and sitemap additions | `/about`, `/privacy`, `/sitemap.xml` | Actual data/analytics/advertising practices, fifty-game wording and a private deletion/support channel; public GitHub is only for non-sensitive feedback |
| 11 | Placement-led ad loading and configuration-readiness script; removed global ad-script injection | Homepage/counter/skill and `npm run ads:check` | Beta should serve no ads; owner still needs AdSense approval, authorized ads.txt, slot IDs and applicable consent configuration |
| 12 | Twenty account operations per minute, fifty retained games per subject and cleanup | `/dashboard` Sync Battles; player/friend history | Completed syncs can repeat without the old cooldown; overlapping syncs still lock. Lifetime win/loss and deck counts are separate |
| 13 | Lint/tooling repair, request-cache race fixes, stricter inputs, isolation/keyboard/cancellation tests and access handoffs | Source diff and automated checks | Inspect failure paths and remaining six image warnings; verify deployment health and real service responses |

The interactive checklist mirrors labels 01–12 at `/dev-review`; label 13 covers implementation/verification for source review. All pre-existing unpublished Windows work and this session's retention changes were preserved in source commit `86e2fe5b0eaa33e1829a9790f472eb9692313037` (122 file entries). Later dev commits add this review hub, beta configuration and deployment notes.

## Already live on the shared database

- Migration `20261031015742_refresh_burst_20_and_history_retention_50` is applied. Both full-history maxima were verified as fifty.
- Deleted 30,361 excess player rows and 18,193 excess friend rows. Lifetime totals remained 46,338 friend wins, 35,668 losses and 220,740 captured/deck-summary games at verification.
- Physical database size fell from 444 MB to 279 MB after maintenance. This is a point-in-time measurement.
- Twenty completed account operations per minute share an account counter across endpoints. Sync still reserves sixteen upstream calls. Account/address/global call budgets and active-job leases remain enforced. Other anonymous counter/model quotas were not raised.
- Beta and main use the existing shared database and model service. Signed-in beta actions modify real records. Use disposable subjects for add/remove and other mutation checks. No duplicate nightly job is deployed on beta; production's existing `0 2 * * *` schedule stays enabled.

## Verification and outstanding work

- Local combined source: all 48 Jest suites / 245 tests, TypeScript and lint passed (six existing image warnings). The final retention-query follow-up passed six affected suites / 28 tests and TypeScript.
- Source-preservation deployment `dpl_oQvdXYVEKpGJTCsH3nKi5Yqi22yH` built successfully in Vercel. Local optimized builds are still blocked by filesystem EPERM; the remote build supplies current optimized-build evidence.
- Public lookup is enabled for beta review only. Production retains its existing feature configuration and source. Real-tag/model/quota/latency checks and signed-in/mobile acceptance are distinct from fixture tests.
- Missing cloud cron commit: `0ee0a4cd238e421cb55a81f68ab180bac7e43b18`, branch `codex/morning-bounded-cron-20261022`. GitHub has neither the branch nor commit; task discovery fails. Recover its source from the original cloud run before claiming its bounded scheduling/fairness work is included. Existing production cron behavior is preserved.
- Private support/deletion contact, AdSense account setup, representative lookup load, real-device exports and social-card compatibility remain owner/release review items.

## Source groups

UI/navigation/fonts: `app/page.tsx`, `app/globals.css`, `components/Navbar.tsx`, `components/MobileNav.tsx`, `components/model-tools/*`, `public/fonts/*`.

Public tools: `app/api/public-player`, `app/api/public-opponents`, `app/compare-players`, `lib/public-*`, `lib/player-comparison.ts`, `lib/async-cache.ts`, `components/PublicPlayerLookup.tsx`, `components/PlayerComparison.tsx`, `components/RecentOpponentImport.tsx`.

Account/rivalry/recap/share: dashboard/account pages, `components/Friend*`, `components/Player*`, `components/RivalryAdvantageCard.tsx`, `components/WeeklyRecapCard.tsx`, `components/ScoreShare.tsx`, and matching `lib` modules/tests.

Retention/refresh: `lib/history-limits.ts`, history/stat readers, updated copy, and the applied SQL migration plus `supabase/tests/refresh_and_retention.sql`.

Content/trust/tooling: guide/about/privacy/tools pages, footer/sitemap, ESLint flat configuration, ad-check/start-preview scripts, docs and the project access skill. Secret environments, player datasets, checkpoints and dependencies were excluded.
