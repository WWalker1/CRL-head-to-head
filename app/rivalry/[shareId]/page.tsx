import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Rivalry snapshot', robots: { index: false, follow: false } };
export default async function RivalryPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params; const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!base) return <main className="mx-auto max-w-xl p-8"><h1>Rivalry snapshot unavailable</h1></main>;
  const response = await fetch(`${base}/api/rivalry-shares?shareId=${encodeURIComponent(shareId)}`, { cache: 'no-store' }).catch(() => null);
  if (!response?.ok) notFound(); const { snapshot } = await response.json();
  return <main className="mx-auto max-w-xl p-8"><div className="rounded-xl bg-gradient-to-br from-blue-900 to-orange-600 p-8 text-white shadow-xl"><p className="text-sm uppercase tracking-wide text-blue-100">Rivalry snapshot</p><h1 className="mt-2 text-3xl font-bold">{snapshot.friendName}</h1><p className="text-blue-100">{snapshot.friendTag}</p><p className="mt-8 text-5xl font-bold">{snapshot.record.wins}–{snapshot.record.losses}</p><p className="mt-1 text-blue-100">lifetime tracked record</p><p className="mt-6 text-sm text-blue-100">Based on {snapshot.window.recordedMatches} recorded matches · top decks cover {Math.round(snapshot.window.topDeckCoverage * 100)}%</p>{snapshot.topDecks?.length ? <div className="mt-6 rounded-lg bg-white/10 p-4"><h2 className="font-semibold">Top recent decks</h2>{snapshot.topDecks.map((deck: any, i: number) => <p key={deck.key} className="mt-2 text-sm">{i + 1}. {deck.cards.map((card: any) => card.id).join(', ')} · {deck.count} matches</p>)}</div> : null}</div></main>;
}
