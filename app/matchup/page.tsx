import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import ModelWorkbench from '@/components/model-tools/ModelWorkbench';

export const metadata: Metadata = {
  title: 'Clash Royale Deck Matchup Predictor',
  description: 'Compare complete Clash Royale decks and see a calibrated model estimate of their matchup. Review the assumptions and limits behind each prediction.',
  alternates: { canonical: '/matchup' },
  openGraph: { title: 'Clash Royale Deck Matchup Predictor | Rival Royale', description: 'Compare complete decks with a model-estimated Clash Royale matchup.' },
};

export default function MatchupPage() {
  const structuredData = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Rival Royale Clash Royale Deck Matchup Predictor', applicationCategory: 'GameApplication', operatingSystem: 'Web', description: 'Compare complete Clash Royale decks and review a model-estimated matchup with support and limitations.' };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <Suspense fallback={<main className="min-h-screen bg-[#0d1024] px-4 py-16 text-white"><h1 className="text-4xl font-black">Read the matchup.</h1><p className="mt-4 text-slate-300">Loading the card catalog…</p></main>}><ModelWorkbench mode="matchup" title="Read the matchup." description="Choose all eight cards for each side to see a calibrated model estimate. Levels and tower troops are optional advanced settings." /></Suspense>
    <section className="bg-[#0d1024] px-4 pb-12 text-slate-300 sm:px-6"><div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-slate-950/60 p-6 sm:p-8"><h2 className="text-2xl font-bold text-white">What does the matchup estimate mean?</h2><p className="mt-3 leading-7">It is the model’s estimate for a decisive match between the selected complete decks under its supported rules and inputs. It is not a guarantee for a particular battle or a rating of either player. Card levels, tower troops, rare combinations, balance changes, and individual decisions can affect what happens in game.</p><h3 className="mt-6 text-lg font-semibold text-white">How should I use it?</h3><p className="mt-2 leading-7">Use the estimate to compare deck ideas and spot potential matchup strengths. The model cannot see starting hands, placements, timing, or player skill. For how estimates and support are handled, read the <Link className="text-violet-300 underline" href="/models">model methodology</Link>, or use the <Link className="text-violet-300 underline" href="/counter-deck">counter deck finder</Link> to explore candidate decks against a target.</p></div></section>
  </>;
}
