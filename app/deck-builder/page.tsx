import type { Metadata } from 'next';
import { Suspense } from 'react';
import ModelWorkbench from '@/components/model-tools/ModelWorkbench';

export const metadata: Metadata = { title: 'Deck Builder', description: 'Complete a Clash Royale deck from the cards you want to play.', alternates: { canonical: '/deck-builder' } };

export default function DeckBuilderPage() { return <Suspense fallback={<main className="min-h-screen bg-[#0d1024] px-4 py-16 text-white"><h1 className="text-4xl font-black">Build from your core.</h1><p className="mt-4 text-slate-300">Loading the card catalog…</p></main>}><ModelWorkbench mode="builder" title="Build from your core." description="Choose the cards you already trust, and ask the model to complete a legal eight-card deck around your starting point." /></Suspense>; }
