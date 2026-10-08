import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import ModelWorkbench from '@/components/model-tools/ModelWorkbench';

export const metadata: Metadata = {
  title: 'Clash Royale Counter Deck Finder',
  description: 'Find Clash Royale counter deck candidates. Choose an eight-card opponent deck, search model-ranked options, and export a suggested deck to the game.',
  alternates: { canonical: '/counter-deck' },
  openGraph: { title: 'Clash Royale Counter Deck Finder | Rival Royale', description: 'Choose a target deck and explore model-ranked counter deck candidates.' },
};

export default function CounterDeckPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Rival Royale Clash Royale Counter Deck Finder',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web',
    description: 'Choose an eight-card Clash Royale target deck and explore model-ranked counter candidates from a bounded search.',
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <Suspense fallback={<main className="min-h-screen bg-[#0d1024] px-4 py-16 text-white"><h1 className="text-4xl font-black">Clash Royale counter deck finder</h1><p className="mt-4 text-slate-300">Loading cards…</p></main>}>
      <ModelWorkbench mode="counter" title="Find a counter deck for Clash Royale" description="Pick the eight cards you want to beat, or load an example deck. Search ranked candidate decks, then export one to Clash Royale." />
    </Suspense>
    <section className="bg-[#0d1024] px-4 pb-16 text-slate-300 sm:px-6" aria-labelledby="counter-guide-heading">
      <div className="mx-auto max-w-6xl border-t border-white/10 pt-9">
        <h2 id="counter-guide-heading" className="text-2xl font-bold text-white">How to find a counter deck</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          <li className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><strong className="text-orange-300">1. Choose a target</strong><p className="mt-2 text-sm leading-6">Enter all eight cards in the opponent deck, or tap an example above.</p></li>
          <li className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><strong className="text-orange-300">2. Find counters</strong><p className="mt-2 text-sm leading-6">Run the search to see candidate decks ranked by the matchup model.</p></li>
          <li className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><strong className="text-orange-300">3. Export a deck</strong><p className="mt-2 text-sm leading-6">Review the cards and open a suggested deck in Clash Royale.</p></li>
        </ol>
        <h2 className="mt-10 text-xl font-bold text-white">How are counters ranked?</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7">Rival Royale searches a limited set of complete decks and ranks them with its matchup model. Suggestions are conditional estimates, not guaranteed wins, live rankings, or measured win rates for your account. Card levels, game balance, and how you play can change the outcome. Read the <Link href="/models" className="font-semibold text-violet-300 underline underline-offset-2">model methodology</Link> or <Link href="/matchup" className="font-semibold text-violet-300 underline underline-offset-2">compare two decks</Link>.</p>
      </div>
    </section>
  </>;
}
