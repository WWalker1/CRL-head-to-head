import type { Metadata } from 'next';
import { Suspense } from 'react';
import ModelWorkbench from '@/components/model-tools/ModelWorkbench';

export const metadata: Metadata = {
  title: 'Clash Royale Counter Deck Finder',
  description: 'Explore model-ranked Clash Royale deck candidates against a target deck. Search is bounded and heuristic, so results are suggestions rather than guaranteed counters.',
  alternates: { canonical: '/counter-deck' },
  openGraph: { title: 'Clash Royale Counter Deck Finder | Rival Royale', description: 'Explore a bounded set of model-ranked counter deck candidates against a target.' },
};

export default function CounterDeckPage() {
  const structuredData = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Rival Royale Clash Royale Counter Deck Finder', applicationCategory: 'GameApplication', operatingSystem: 'Web', description: 'Explore model-ranked deck candidates against a Clash Royale target deck using a bounded search.' };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <Suspense fallback={<main className="min-h-screen bg-[#0d1024] px-4 py-16 text-white"><h1 className="text-4xl font-black">Find a counter line.</h1><p className="mt-4 text-slate-300">Loading the card catalog…</p></main>}><ModelWorkbench mode="counter" title="Find a counter line." description="Choose a complete deck to target. Search explores a bounded set of supported candidate decks, preserves cards you lock, and ranks results using model estimates." /></Suspense>
    <section className="bg-[#0d1024] px-4 pb-12 text-slate-300 sm:px-6"><div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-slate-950/60 p-6 sm:p-8"><h2 className="text-2xl font-bold text-white">How counter search works</h2><p className="mt-3 leading-7">The finder checks a limited set of complete candidate decks and ranks them against the target using the matchup model. You can lock cards to keep them in the candidates. Because search is heuristic and limited to supported candidates, it does not test every possible deck or promise a best possible counter.</p><h3 className="mt-6 text-lg font-semibold text-white">Treat suggestions as starting points</h3><p className="mt-2 leading-7">A model estimate is not an observed win rate for your account. Deck familiarity, player decisions, balance updates, and unusual card combinations can change a real matchup. Compare the <a className="text-violet-300 underline" href="/matchup">matchup estimate</a> for complete decks and see the <a className="text-violet-300 underline" href="/models">methodology and known limitations</a>.</p></div></section>
  </>;
}
