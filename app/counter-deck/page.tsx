import type { Metadata } from 'next';
import { Suspense } from 'react';
import ModelWorkbench from '@/components/model-tools/ModelWorkbench';

export const metadata: Metadata = { title: 'Counter Deck Finder', description: 'Find supported Clash Royale counter candidates while keeping the cards you lock.', alternates: { canonical: '/counter-deck' } };

export default function CounterDeckPage() { return <Suspense fallback={<main className="min-h-screen bg-[#0d1024] px-4 py-16 text-white"><h1 className="text-4xl font-black">Find a counter line.</h1><p className="mt-4 text-slate-300">Loading the card catalog…</p></main>}><ModelWorkbench mode="counter" title="Find a counter line." description="Start with the deck you want to beat. Lock the cards you want to keep, and the bounded search will return the strongest supported candidates it can find." /></Suspense>; }
