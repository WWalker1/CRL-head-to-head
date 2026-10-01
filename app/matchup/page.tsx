import type { Metadata } from 'next';
import { Suspense } from 'react';
import ModelWorkbench from '@/components/model-tools/ModelWorkbench';

export const metadata: Metadata = { title: 'Matchup Predictor', description: 'Compare two Clash Royale decks with a calibrated model estimate.', alternates: { canonical: '/matchup' } };

export default function MatchupPage() { return <Suspense fallback={<main className="min-h-screen bg-[#0d1024] px-4 py-16 text-white"><h1 className="text-4xl font-black">Read the matchup.</h1><p className="mt-4 text-slate-300">Loading the card catalog…</p></main>}><ModelWorkbench mode="matchup" title="Read the matchup." description="Pick cards for both decks to see the model-estimated matchup. Levels and tower troops are optional advanced settings." /></Suspense>; }
