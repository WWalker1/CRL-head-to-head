import type { Metadata } from 'next';
import Link from 'next/link';
import ArticlePage from '@/components/ArticlePage';

export const metadata: Metadata = {
  title: 'Clash Royale Strategy Guides',
  description: 'Practical Clash Royale guides for elixir decisions, reviewing losses against friends, building a deck, and understanding matchup statistics.',
  alternates: { canonical: '/guides' },
};

const guides = [
  { href: '/guides/elixir-management', title: 'Elixir management: when to defend, pressure, or wait', description: 'Work through a defensive trade, budget a counterpush, and practice tracking the answer that matters.' },
  { href: '/guides/review-clash-royale-losses', title: 'How to review a loss against a friend', description: 'Find the first costly decision, distinguish a deck problem from a sequencing problem, and test one adjustment.' },
  { href: '/clash-royale-counter-deck-finder', title: 'Build a deck with a plan', description: 'Assign eight card roles, understand the tradeoffs, and prepare for a friend’s recorded deck.' },
  { href: '/guides/understand-skill-score', title: 'Understand your matchup skill score', description: 'A worked example of expected wins, small samples, and how to choose games for review.' },
];

export default function GuidesPage() {
  return <ArticlePage title="Clash Royale strategy guides" intro="A better rivalry starts with a better question. These guides help you turn a result into something specific to practice in your next game.">
    <section aria-labelledby="strategy-guides"><h2 id="strategy-guides">Choose what to work on</h2><ul className="space-y-5">{guides.map(guide => <li key={guide.href}><Link href={guide.href}>{guide.title}</Link><p>{guide.description}</p></li>)}</ul></section>
    <section><h2>How to use these guides</h2><p>Start with one recurring situation: running out of elixir on defense, losing to the same push, or changing decks after every loss. Read the relevant guide, choose one practice goal, and compare a set of games under similar rules. The examples illustrate decisions; they are not claims about the current best deck or guaranteed interactions at every card level.</p><p>You can read every guide without an account. The <Link href="/matchup">deck matchup tool</Link> and <Link href="/counter-deck">counter finder</Link> also support limited guest use. Recording your own friend rivalries requires signing in.</p></section>
    <section><h2>Editorial approach</h2><p>Published by Rival Royale. Our guides combine explanations of game mechanics with original worked examples and practice routines. Hypothetical games are labeled, model estimates are kept separate from measured results, and relevant official references are linked in the articles. These guides do not claim professional-player testing or live meta rankings.</p><p>Game updates can change card interactions. Check the in-game rules, levels, and card descriptions when applying an example. If you spot an error, <Link href="/contact">send us the page and correction</Link>.</p></section>
  </ArticlePage>;
}
