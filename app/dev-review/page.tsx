import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dev review checklist',
  robots: { index: false, follow: false },
};

const changes = [
  { title: 'Visual refresh and navigation', href: '/', scope: 'Public', checks: ['Review the new warm palette, typography, homepage and tool directory.', 'At phone width, open the menu, choose a link, reopen it and press Escape. Check that it closes and pages do not scroll sideways.'] },
  { title: 'Guides and score calculator', href: '/guides', scope: 'Public', checks: ['Read both guides for clarity and accuracy.', 'In the matchup-skill guide, set ten games, six wins and 70% expected wins: the example score should be 40.'] },
  { title: 'Public recent-player lookup', href: '/clash-royale-skill-score', scope: 'Enabled on dev', checks: ['Try your tag and several known tags. Compare the recent record with the game log; this snapshot uses up to 25 eligible games.', 'Check invalid tags, unsupported results, loading and error messages. Recent tags should stay in this browser and be removable.'] },
  { title: 'Two-player comparison', href: '/compare-players', scope: 'Enabled on dev', checks: ['Look up two tags, then change one while a request is loading.', 'Comparison should require compatible model/date coverage and enough supported games. It should explain missing coverage without declaring an overall winner.'] },
  { title: 'Counter finder and recent opponents', href: '/counter-deck', scope: 'Model service', checks: ['Choose and replace cards; verify slots stay the same size. Test search, forms, keyboard focus and Escape in the picker.', 'Import a recent opponent, request a counter, change the target and check old results clear. Open an export link in Clash Royale and verify card forms in game.'] },
  { title: 'Account pages and rivalry dashboard', href: '/dashboard', scope: 'Sign in', checks: ['Review login, signup, password recovery and dashboard on a phone.', 'Check that friend win/loss records remain the main focus and Elo is secondary. Test adding and removing a disposable friend.'] },
  { title: 'Friend deck and matchup advantage', href: '/dashboard', scope: 'Sign in → friend deck page', checks: ['Open a friend deck page from the dashboard. Review actual wins, expected wins, deck advantage and sample explanations.', 'Try the latest-deck rematch shortcut. Counter generation should require a click; changing friend or deck should discard stale results.'] },
  { title: 'Player/friend stats and weekly recap', href: '/stats', scope: 'Sign in', checks: ['Check tough wins, favored losses, score explanation and the newest 50-game window.', 'Review the recap on player/friend history pages. A truncated window must not claim to cover every game in the week.'] },
  { title: 'Sharing and saved recent tags', href: '/clash-royale-skill-score', scope: 'Lookup → share preview', checks: ['Open the score-card preview. Test copy, native share where supported, SVG download and dismissal.', 'Check the card for legible text and sensible missing-score handling. Rivalry links still require explicit sharing and support revocation.'] },
  { title: 'About, privacy and footer', href: '/privacy', scope: 'Public', checks: ['Review the stated account, history, analytics, local-storage and advertising practices; the retention copy should say 50.', 'Check About, footer links and the non-sensitive feedback link. A private support/deletion contact still needs an owner decision.'] },
  { title: 'Ads and analytics', href: '/', scope: 'Ads off on beta', checks: ['Confirm no ad placements obstruct controls. Beta intentionally does not serve ads.', 'AdSense approval/slot IDs and social-platform SVG previews still need separate verification. Public-lookup analytics events exclude tags, decks and scores.'] },
  { title: 'Refresh allowance and database retention', href: '/dashboard', scope: 'Already live in shared database', checks: ['After each sync finishes, another sync can start without the old 60-second cooldown. The per-account allowance is 20 operations per minute; overlapping jobs remain locked.', 'Full owner/friend histories retain the newest 50 games. Lifetime win/loss and deck totals remain separate; the cleanup reduced database size from 444 MB to 279 MB.'] },
];

export default function DevReviewPage() {
  if (process.env.DEV_REVIEW_ENABLED !== '1') notFound();
  return <main className="rr-page"><div className="rr-container py-12 sm:py-16">
    <p className="rr-kicker">October 31, 2026 · Development review</p>
    <h1 className="rr-title mt-3">What changed, and what to try.</h1>
    <p className="mt-5 max-w-3xl leading-7 text-stone-600">This is the new dev build. Review each numbered area below. Signed-in actions use the existing shared database and update real account records; use a disposable account or friend for destructive checks.</p>
    <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-stone-700"><strong>Still open:</strong> the separately saved cloud cron changes have not been recovered or included. Real-account/mobile acceptance, representative public-lookup load checks, a private support contact and AdSense account setup remain review items. The production nightly schedule remains unchanged.</div>
    <ol className="mt-10 grid gap-5 lg:grid-cols-2">{changes.map((change, index) => <li key={change.title} className="rr-tool-card">
      <p className="rr-kicker">{String(index + 1).padStart(2, '0')} / {change.scope}</p>
      <h2 className="mt-4 text-xl font-bold">{change.title}</h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-stone-600">{change.checks.map(check => <li key={check}>{check}</li>)}</ul>
      <Link href={change.href} className="rr-button mt-5">Review this area →</Link>
    </li>)}</ol>
    <p className="mt-8 text-sm leading-6 text-stone-600">Automated verification: 245 JavaScript tests, TypeScript and lint passed. A cloud production build passed. These checks do not establish real-device, signed-in or load acceptance.</p>
  </div></main>;
}
