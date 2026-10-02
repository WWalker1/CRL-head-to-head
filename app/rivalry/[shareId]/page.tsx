import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import catalog from '@/models/release-bundle/card-catalog.json';
import { getPublicRivalrySnapshot } from '@/lib/rivalry-public';
import type { DeckUsage } from '@/lib/friend-history';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Rivalry snapshot',
  description: 'A shared Clash Royale head-to-head record from Rival Royale.',
  robots: { index: false, follow: false },
};

const variants = new Map(catalog.variants.map(card => [card.key, card]));

function RecentDeck({ deck, rank }: { deck: DeckUsage; rank: number }) {
  return <section className="rounded-xl border border-white/15 bg-white/10 p-3 sm:p-4">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="text-sm font-bold">Deck {rank}</h3>
      <span className="text-xs text-blue-100">{deck.count} recorded {deck.count === 1 ? 'match' : 'matches'}</span>
    </div>
    <div className="grid grid-cols-4 gap-2" aria-label={`Deck ${rank} cards`}>
      {deck.cards.map((card, index) => {
        const variant = variants.get(`${card.id}:${card.form ?? 0}`) ?? variants.get(`${card.id}:0`);
        const name = variant?.name || card.name || `Card ${card.id}`;
        return <div key={`${card.id}-${index}`} className="min-w-0 overflow-hidden rounded-lg border border-white/15 bg-blue-950/35">
          {variant?.image ? <img src={variant.image} alt={name} loading="lazy" className="aspect-[3/4] w-full object-contain" /> : <div className="flex aspect-[3/4] items-center justify-center px-1 text-center text-[10px]">{name}</div>}
          <span className="block truncate px-1 py-1 text-center text-[10px] text-blue-50" title={name}>{name}</span>
        </div>;
      })}
    </div>
  </section>;
}

export default async function RivalryPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const snapshot = await getPublicRivalrySnapshot(shareId);
  if (!snapshot) notFound();

  return <main className="min-h-[calc(100vh-73px)] bg-[#0d1024] px-4 py-8 text-white sm:px-6 sm:py-12">
    <article className="mx-auto max-w-2xl">
      <div className="rounded-2xl bg-gradient-to-br from-blue-900 to-orange-600 p-5 shadow-xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">Rivalry snapshot</p>
        <h1 className="mt-3 break-words text-3xl font-black sm:text-4xl">{snapshot.friendName}</h1>
        <p className="mt-1 text-sm text-blue-100">{snapshot.friendTag}</p>
        <p className="mt-8 text-5xl font-black tabular-nums sm:text-6xl">{snapshot.record.wins}–{snapshot.record.losses}</p>
        <p className="mt-1 text-sm text-blue-100">Tracked head-to-head wins and losses</p>
        <p className="mt-6 text-sm leading-6 text-blue-50">Deck insights use {snapshot.window.recordedMatches} recently recorded eligible {snapshot.window.recordedMatches === 1 ? 'match' : 'matches'}. The decks shown cover {Math.round(snapshot.window.topDeckCoverage * 100)}% of that window.</p>
        {snapshot.topDecks?.length ? <div className="mt-6 space-y-3"><h2 className="text-lg font-bold">Most-played recent decks</h2>{snapshot.topDecks.map((deck, index) => <RecentDeck key={deck.key} deck={deck} rank={index + 1} />)}</div> : null}
        <p className="mt-6 text-xs text-blue-100">Snapshot created {new Date(snapshot.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}. The record may have changed since then.</p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold"><Link href="/" className="inline-flex min-h-11 items-center rounded-lg border border-white/20 px-4 text-white hover:border-orange-300">Explore Rival Royale</Link><Link href="/counter-deck" className="inline-flex min-h-11 items-center rounded-lg bg-orange-600 px-4 text-white hover:bg-orange-500">Find a counter deck</Link></div>
    </article>
  </main>;
}
