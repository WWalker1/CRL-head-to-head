# Rival Royale UI and AdSense readiness — November 11, 2026

Branch: `codex/production-ui-ad-readiness`, created directly from fetched production `origin/main` at `0caa037`. The earlier development redesign and local storage-compaction work are not included. The user authorized publishing these reviewed changes to production. Ad serving remains disabled; account settings and the nightly collector configuration are preserved.

## UI changes

- Preserve the production colors, visual language, navigation labels and tool flow.
- Target deck uses eight compact columns on desktop and four on phones. Matchup forms retain four columns with a width cap. Example decks are narrower on desktop.
- Empty and filled slots use the same artwork box and fixed caption space. Artwork cannot enlarge its parent from intrinsic image dimensions.
- Mobile navigation closes on link selection (including the current route), on route changes, outside pointer presses, and Escape. Escape restores focus to the summary.
- The complete tool shell and empty slots are server-rendered. The previous full-page loading wrappers are removed. Card-library loading is a small status message; optional examples no longer delay a successful catalog response.
- Friend-deck query loading remains inside its own small Suspense boundary. Existing friend-deck loading, counter export and stale-prediction protections pass regression tests.

## AdSense finding and changes

The supplied AdSense screenshot states **Low value content**. It does not identify a specific offending URL. No claim is made that these changes guarantee approval.

Concrete gaps addressed:

- Added public About, Contact and Privacy pages. Contact uses the owner-provided `wwwestonwalker@gmail.com`; no Resend account or new address was provisioned.
- Added source-checked disclosures for account data, game records, bounded recent histories, aggregates, optional sharing, providers, analytics, cookies and potential Google advertising.
- Corrected the older information page's misleading “only store” wording, which omitted account and analytics data.
- Expanded the existing counter guide with an eight-card worked example, roles, tradeoffs, a process for preparing for a friend's deck, and a way to test one change at a time. This stays on the existing canonical URL.
- Added an original skill-score guide with a four-game calculation using the implemented formula, provisional sample threshold, fallback distinction and review questions.
- Added contextual links and a crawlable footer so the guides and trust pages are discoverable, including the formerly orphaned counter guide. Sitemap now contains 11 canonical public URLs.
- Added Supercell's unofficiality notice and policy link. No ad-serving flags or automatic placement settings were enabled.

## Verification

- 36 JavaScript test suites, **198 tests passed**. New behavior tests cover mobile closure, required catalog failure, optional example failure and a slow example response.
- TypeScript checking passed; optimized production build passed with placeholder build credentials. No production credentials were used for the build.
- Browser checks used actual public card catalog/example data through the existing local preview path. No live counter-search quota, signed-in user data or production write was used.
- Desktop at 1440 × 1000: empty and filled target grids both **201.3125 px** high; eight card slots are each 126.25 × 201.3125 px.
- Phone at 390 × 844: four-card and five-card target grids both **277.5 px** high; all eight slots stay 73 × 134.75 px. No page-wide overflow.
- Browser navigation reached `/info` and confirmed the mobile menu was closed after navigation. Privacy, deck guide and skill guide rendered at phone width without page-wide overflow.
- Production-server HTTP checks: all 11 public pages return 200, permit indexing, declare self-canonical URLs, and contain one H1. Counter and matchup initial HTML contains all 8/16 card slots and no old full-page loading fallback. Sitemap contains all 11 public URLs.
- React review: server-side auth remains in Navbar, only the mobile disclosure is a client boundary; effect listeners clean up; async fetches abort; friend query dependencies use primitive strings; public pages remain server-rendered and links remain crawlable.

This is UI/content verification, not a new signed-in tracking or model-quality audit. Model code and database schema were not changed.

## Before applying again

1. Review and publish this branch's changes; Google cannot review changes that exist only in a branch. Confirm the privacy disclosures against final production configuration.
2. In AdSense, finish and test applicable regional privacy/consent messages, including refusal and changing choices, before enabling ads. A privacy page is not a consent mechanism.
3. Review ad category blocking against Supercell's fan-content restrictions. Exclude account, password, private stats and other low-content/utility screens from Auto ads; avoid overlays and placement beside card/action controls.
4. After the live public pages are accessible and the changes are reviewed, request a new AdSense review. Genuine repeat usage and a consistent web presence still take time; no arbitrary article count or artificial traffic guarantees acceptance.

## Release security checks — November 12

Updated Next.js and its ESLint configuration to 16.4.6 and the locked DOMPurify dependency to 3.4.17. The production dependency audit now reports zero known vulnerabilities. All 198 tests and the optimized production build passed using Node 22, matching the hosting runtime. Authentication, model implementation, database schema and Railway nightly schedule are unchanged.

## Sources reviewed

- https://support.google.com/adsense/answer/7299563 — original content, value and navigation.
- https://support.google.com/adsense/answer/81904 — rejection reasons and content/navigation guidance.
- https://support.google.com/adsense/answer/1348695 — required advertising cookie disclosures.
- https://support.google.com/adsense/answer/13554116 — regional consent platform requirements.
- https://supercell.com/en/fan-content-policy/ — unofficiality notice and ad restrictions.


## Follow-up: dark mode and preview tools

- Replaced the small baseline hyphen with a centered en dash, explicit contrast, fixed spacing and tabular record numbers. Added a screen-reader record label and wrapping for large totals.
- Added native `prefers-color-scheme: dark` styles for friend cards and links, Elo text, account forms, add-friend controls, public landing and information pages, article/table content, footer and light skill-summary variants. Day colors are preserved. Root `color-scheme` now matches the preferred scheme for native controls.
- Browser checks used native dark preference, not a recolored screenshot. All three record pieces have the same measured vertical center. Add-friend input uses slate-100 text on slate-800. Synthetic records 1–0, 281–377 and 10000–0 render without phone overflow at 390 px. Public skill, skill guide, privacy and counter pages render without phone overflow.
- Found preview model variables restricted to `codex/rival-model-product`. Re-scoped the four Preview-only model/history settings (`MODEL_TOOLS_ENABLED`, `NEXT_PUBLIC_MODEL_TOOLS_ENABLED`, `MATCH_HISTORY_ENABLED`, `MODEL_SERVICE_URL`) to `codex/production-ui-ad-readiness` and explicitly enabled the three flags. The first corrected preview restored navigation but its model catalog/examples returned 401 because the old preview token was stale. Restored that stale override to its old branch and made the current server-only `MODEL_SERVICE_TOKEN` available in Preview as well as Production without reading, changing or exposing its value. Vercel does not allow a single variable to target Production plus a branch-scoped Preview, so the current token is a project Preview default; the model URL and feature flags remain restricted to this review branch. Production values and the production deployment remain unchanged, as does the separate beta project. Existing preview URLs are immutable and must be replaced with the latest preview after rebuilding.
- The local visual fixture uses synthetic example records, performs no account writes, and is excluded from the pushed branch.

- Follow-up validation: 36 suites / 198 tests and TypeScript/optimized build passed. Hosted preview verification checks both navigation and model API responses; the first preview API failure was caught and corrected before reporting completion.
