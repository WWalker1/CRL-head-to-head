# Public value and usability rollout

## October 22 continuation

Read `docs/MORNING_BRIEF_2026-10-22.md` for the current combined Windows state, verified morning-run outcomes, exact release unblockers and uncompleted backlog. The following original batch description is historical. Public lookup, privacy/about/footer, homepage public entry, analytics and lint/runtime fixes are now staged locally; none is pushed or deployed. Current full-suite result: 37 suites / 204 tests; TypeScript and lint pass (nine warnings). An earlier Webpack build passed; the final-source build is blocked by host directory-creation EPERM errors. Browser/live/load verification remains blocked or pending. The separate cloud cron commit has **not** been integrated. Automatic approval review blocked the attempted Linear report/ticket updates; the local report is saved.

## Scope and estimate

Owner authorized modular implementation, testing and dev releases. Budget roughly **3–5 focused working days (18–30 active engineering hours)** for the core AdSense response, depending on access and integration findings. This is an effort estimate, not a promise of unattended work continuing between sessions or of AdSense approval. The broader cron, cost and Muse workflow backlog is separate.

| Module | Estimated active effort | Owner validation |
| --- | --- | --- |
| 1. Mobile navigation and stable deck slots | 2–4 hours | Phone navigation, card selection and tap targets |
| 2. Original public analysis guides and interactive example | 3–5 hours | Usefulness, clarity and visual direction |
| 3. Public player lookup with shared quotas and bounded inference | 8–12 hours | Several known tags, comparison with in-game logs, sample and error messages |
| 4. Homepage, trust information and complete visitor journey | 3–5 hours | Contact identity, actual data practices, preferred primary action |
| 5. Dev acceptance, indexing checks and release preparation | 2–4 hours | Final public/mobile walkthrough; decision to release and request review |

## This batch

- Mobile navigation closes on link selection (including the same route), route changes, outside pointer interaction and Escape. Escape restores focus to its summary. Desktop navigation begins at the large breakpoint so the added Guides link fits tablet widths.
- Deck slots use equal aspect-ratio artwork areas and two-line captions in both empty and selected states. Images cannot dictate grid width or card height. Caption lines truncate on narrow screens.
- `/guides` indexes two original guides: `/guides/matchup-skill` and `/guides/review-a-matchup`.
- The skill guide explains the production formula, eligibility, provisional samples, the separate record-score fallback and model limitations. A hypothetical ten-game calculator uses `summarizeMatchupSkill`, the same pure scoring function as the application. It makes no external API requests.
- The review guide gives a practical five-step replay routine, a clearly hypothetical worked review note and limitations of counter recommendations.
- Homepage, skill landing page, navigation and sitemap link to the public material. No account is required to read the guides or use the calculator. The copy does not claim public personal lookup is already implemented.

No authentication policy, private history endpoint, database schema, model service, advertising enablement or production cron change is included.

## Release mechanics

The online main head was checked through GitHub at `c48fffba8f06b5c18956a2448f19d12e73a3697c` before changes; local main matched. Local git metadata is read-only in this environment. Intended release: commit tested source through the GitHub connector to `dev`, keeping production `main` unchanged. **Actual status: not pushed.** Branch creation returned HTTP 403, `Resource not accessible by integration`; the repository metadata's push permission did not establish that the integration could perform the write.

The normal Vercel project is `crl-head-to-head`; non-main Git integration builds are previews. `beta.rival-royale.com` is a separate manually deployed project. A successful dev branch push does not prove that public beta changed. Report the actual deployment state and URL. Never deploy the production cron configuration as a beta production release.

A fallback source-based preview upload to the existing Vercel project was rejected by automatic approval review: it requires explicit user authorization to upload the application source to that external destination. No deployment was created by this attempt. Do not retry through another upload path without resolving that approval. The proposed payload contains application source/configuration and public assets, excluding environment files, credentials, datasets, models, local git metadata and dependencies.

## Verification completed

- Full Jest suite: **33 suites, 180 tests passed** using the writable cache directory `C:/Users/22wes/AppData/Local/Temp/rival-royale-jest-20261022`.
- TypeScript check and optimized Next.js build passed. Build includes all three guide routes. Existing warnings concern the middleware convention and browser-support data age.
- Signed-out browser: guide renders, sliders change the expected score (six wins and 70% expectation yields 40), and mobile menu closes when Guides is selected.
- A temporary local fixture exercised the actual `VisualDeckForm` with an image-backed Evolution card. All eight slots remained equal before and after selection: 83.5 × 148.375 pixels at a 390px viewport and 66 × 126.5 pixels at 320px. At 320px, document scroll width equaled client width; no horizontal overflow. The fixture was removed and is not part of the deliverable.
- No player/model API requests are made by the calculator. Signed-in flows and real-device acceptance remain outside this batch's verification.

## Acceptance checklist

- On a phone, choose Guides from the menu; the menu closes. Choose the current route and press Escape in the menu too.
- Fill and replace deck slots with base, Evolution and Hero cards. Compare height before/after selection and confirm there is no horizontal scrolling at 320–390px.
- Open both guides signed out. Change the calculator sliders: six wins at 50% expectation gives 60; six at 70% gives 40. Nothing should request a player tag or call the game/model API.
- Follow guide links from the homepage, navigation and skill page. Check the counter CTA with the model-tools flag enabled.
- Confirm language is useful to real players and that hypothetical examples cannot be mistaken for collected player results.

## Remaining work

Public personal lookup remains the next functional module. It must use public-derived results, shared fail-closed quotas, bounded request/inference work and an explicit recent-snapshot label. Do not expose owner history as a shortcut. Verify database state and use a dev-safe migration process before any shared budget changes.

Privacy/contact verification and the full public visitor journey remain open. Do not resubmit an unchanged site or assume these initial guides alone guarantee approval.
