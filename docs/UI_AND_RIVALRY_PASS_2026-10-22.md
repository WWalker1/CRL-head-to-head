# UI and rivalry implementation — October 22, 2026

## Product decisions

No rivalry milestones. The central question is who won, who had favorable decks, and who outperformed the modeled matchups.

The new direct rivalry summary filters the account's retained friend history to games against the owner's tag, reverses outcomes and probabilities into the owner's perspective, excludes duplicates/draws/unsupported predictions, and uses the current model version with post-training games only. Four owner wins in ten games with two expected wins produces +2 wins above expectation and an adjusted owner edge, despite the 4–6 record. An edge is displayed only after ten scored games and at least five percentage points of difference. Those are presentation thresholds, not significance tests. The view explicitly distinguishes retained direct games from accumulated dashboard totals; it cannot reconstruct deleted deck history or prove overall skill.

## Implemented

- Warm neutral page surfaces, charcoal deck workspace, restrained orange actions, smaller corner radii, consistent borders and focus states.
- Locally hosted IBM Plex-derived typography: renamed Latin subsets under SIL OFL, about 75 KB total WOFF2. Licenses and provenance in `public/fonts`.
- Compact navigation: Tools, Guides, sign-in/account action. New `/tools` directory gathers feature destinations.
- Homepage with a clearly labeled 4–6 illustrative rivalry, accordion FAQ and coherent content hierarchy. Account forms retain visible labels and 44–48px controls.
- Dashboard emphasizes head-to-head record; Elo is secondary disclosure. Removed automatic per-friend model-score fetches from the overview.
- Direct matchup advantage on the friend page, with a separate explanation of actual/expected wins, deck advantage and sample limits.
- Rematch shortcut imports the friend's latest retained deck. Import preserves all forms, levels and tower; incomplete records are rejected instead of assigned defaults.
- Counter Finder collapses optional import/example controls. Card picker traps keyboard navigation and restores focus on close. Counter requests on the friend page require an explicit action and abort on subject/deck change.
- Up to five recent lookup tags stored only in this browser with a clear action; privacy copy updated.
- Expandable score explanation and modal SVG share-card preview. Native share/clipboard and download remain explicit actions.
- Existing guides, account pages, methodology and stats surfaces align with the new palette. Main edited components were formatted into readable JSX.

## Ads

Three manual placement integrations remain available, separated from controls. Removed global ad-script injection from the root layout: a configured placement loads it. Google Auto ads settings can still affect client navigation after a script has loaded, so account settings matter.

`npm run ads:check` now reports configuration readiness without exposing values. The local check confirms no slot IDs, no configured canonical production origin and ad serving off/unset. This is not a read of production Vercel configuration. Exact activation steps and Google references are in `ADSENSE_ACTIVATION.md`. No Google approval or actual ad serving is claimed.

## Verification

- Jest: 48 suites / 245 tests pass, including direct rivalry reversal, filtering, training/version boundaries, incomplete deck rejection, local tag storage, keyboard containment, and explicit/cancelled counter requests.
- TypeScript passes. ESLint: zero errors, six remaining image optimization warnings. Git whitespace check passes.
- Local Next.js Webpack dev server and Chrome browser now work in this session; earlier loopback failure is no longer current for this session.
- Browser review exercised actual routes at 1440px and 390px: tools, counter editor, card picker, score lookup, preview dialog, homepage, menu and login. No page errors or horizontal overflow in the reviewed states. Escape dismissal passed. Opponent import → counter → export and latest-deck rematch import passed with intercepted fixture APIs.
- Actual FriendCard and RivalryAdvantageCard components were rendered with clearly labeled synthetic records for mobile/desktop visual inspection. This is not authenticated production QA.
- Production build remains blocked by host EPERM creating `.next/types/app/ads.txt`; dev rendering is not a substitute for a successful optimized build.

## Remaining release work

Restore Git/Vercel release access and production-build output permissions; recover/integrate the separate morning cron commit; review actual signed-in account flows and real model/game responses in dev; obtain actual AdSense slot IDs and verify site Ready, ads.txt Authorized and applicable consent messages in AdSense; configure and deploy production only after dev verification.

All changes are local and uncommitted. No new migration, collector or live ad activation was performed.
