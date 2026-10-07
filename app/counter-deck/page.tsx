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
    <Suspense fallback={<main className="min-h-screen bg-[#0d1024] px-4 py-16 text-white"><h1 className="text-4xl font-black">Find a counter deck</h1><p className="mt-4 text-slate-300">Loading cards…</p></main>}><ModelWorkbench mode="counter" title="Find a counter deck" description="Choose an opponent deck. See model-ranked counters you can export to Clash Royale." /></Suspense>
    <section className="bg-[#0d1024] px-4 pb-12 text-slate-300 sm:px-6"><details className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-slate-950/60 p-5 sm:p-6"><summary className="cursor-pointer text-base font-bold text-white">How are counters ranked?</summary><p className="mt-4 max-w-3xl text-sm leading-6">Rival Royale searches a limited set of complete Clash Royale decks and ranks them with its matchup model. The results are suggestions, not guaranteed wins or measured win rates for your account. Card levels, game balance, and how you play can change the outcome. Read the <a className="text-violet-300 underline" href="/models">model methodology</a> or <a className="text-violet-300 underline" href="/matchup">compare two decks</a>.</p></details></section>
  </>;
}
