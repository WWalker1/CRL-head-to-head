'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { DeckUsage, FriendHistorySummary } from '@/lib/friend-history';
import { buildClashDeckLink, CLASH_DECK_IMPORT_NOTICE } from '@/lib/clash-deck-link';
import { counter, fetchCatalog } from './model-tools/api';
import type { CatalogVariant, Deck, ModelResult } from './model-tools/types';

function modelDeck(usage: DeckUsage): Deck | null {
  if (usage.cards.length !== 8) return null;
  const cards = usage.cards.map(card => ({ key: `${card.id}:${Number(card.form ?? 0)}`, level: card.level ?? 16 }));
  if (cards.some(card => !/^[0-9]+:[012]$/.test(card.key))) return null;
  return { cards, tower_id: Number(usage.tower) || 159000000, tower_level: usage.towerLevel ?? 16 };
}

function DeckCards({ deck, variants }: { deck: Deck; variants: CatalogVariant[] }) {
  const lookup = new Map(variants.map(variant => [variant.key, variant]));
  return <div className="grid grid-cols-4 gap-2 sm:gap-3" aria-label="Eight deck cards">
    {deck.cards.map((card, index) => {
      const variant = lookup.get(card.key);
      return <div key={`${card.key}-${index}`} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-center">
        {variant?.image ? <img src={variant.image} alt="" loading="lazy" className="mx-auto aspect-[3/4] w-full object-contain" /> : <div className="flex aspect-[3/4] items-center justify-center px-1 text-xs text-slate-600">{variant?.name ?? card.key.split(':')[0]}</div>}
        <span className="block truncate px-1 py-1.5 text-[10px] text-slate-700 sm:text-xs">{variant?.name ?? card.key.split(':')[0]}</span>
      </div>;
    })}
  </div>;
}

export default function FriendDeckPageExperience({ friendId }: { friendId: string }) {
  const [summary, setSummary] = useState<FriendHistorySummary | null>(null);
  const [friendName, setFriendName] = useState('Friend');
  const [friendTag, setFriendTag] = useState('');
  const [variants, setVariants] = useState<CatalogVariant[]>([]);
  const [selected, setSelected] = useState(0);
  const [result, setResult] = useState<ModelResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState('');

  const load = async (method: 'GET' | 'POST', signal?: AbortSignal) => {
    const response = await fetch(method === 'GET' ? `/api/friend-decks?friendId=${encodeURIComponent(friendId)}` : '/api/friend-decks', {
      method, signal, credentials: 'same-origin', headers: method === 'POST' ? { 'content-type': 'application/json' } : {},
      ...(method === 'POST' ? { body: JSON.stringify({ friendId }) } : {}),
    });
    if (!response.ok) throw new Error(response.status === 401 ? 'Sign in to see your friend’s decks.' : 'Could not load this friend’s deck history.');
    let payload = await response.json();
    if (method === 'GET' && !payload.summary?.recordedMatches) {
      const refreshed = await fetch('/api/friend-decks', { method: 'POST', signal, credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ friendId }) });
      if (refreshed.ok) payload = await refreshed.json();
    }
    setSummary(payload.summary);
    setFriendName(payload.friend?.friend_name || 'Friend');
    setFriendTag(payload.friend?.friend_player_tag || '');
    setSelected(0);
    setResult(null);
  };

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([load('GET', controller.signal), fetchCatalog(controller.signal)]).then(([history, catalog]) => {
      if (controller.signal.aborted) return;
      if (history.status === 'rejected') setError(history.reason instanceof Error ? history.reason.message : 'Could not load deck history.');
      if (catalog.status === 'fulfilled') setVariants(catalog.value.variants ?? []);
      setLoading(false);
    });
    return () => controller.abort();
  }, [friendId]);

  const usage = summary?.topDecks[selected];
  const target = useMemo(() => usage ? modelDeck(usage) : null, [usage]);
  useEffect(() => {
    if (!target) { setResult(null); return; }
    const controller = new AbortController();
    setScoring(true);
    setResult(null);
    counter(target, [], 16, target.tower_id, 16, controller.signal)
      .then(setResult)
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not find a counter.'); })
      .finally(() => { if (!controller.signal.aborted) setScoring(false); });
    return () => controller.abort();
  }, [target]);

  const best = result?.candidates?.[0];
  let exportUrl: string | null = null;
  if (best?.deck) { try { exportUrl = buildClashDeckLink(best.deck); } catch { /* leave invalid model output without an export action */ } }

  const refresh = async () => {
    setLoading(true); setError('');
    try { await load('POST'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not refresh deck history.'); }
    finally { setLoading(false); }
  };

  return <section className="space-y-6 text-slate-900" aria-label={`${friendName} most played decks and counters`}>
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-sm font-semibold text-violet-700">Friend decks</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">{friendName}&apos;s most-played decks</h1><p className="mt-1 text-sm text-slate-600">{friendTag || 'Recent recorded 1v1 matches'} · choose a deck to see a counter.</p></div>
      <button type="button" onClick={refresh} disabled={loading} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Refresh history</button>
    </header>
    {error && <p role="alert" className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800">{error}</p>}
    {loading && <p role="status" className="text-sm text-slate-600">Loading recorded decks…</p>}
    {!loading && summary && <>
      <p className="text-sm text-slate-600">Based on {summary.recordedMatches} eligible recorded matches. The list covers {Math.round(summary.coverage * 100)}% of those matches.</p>
      {summary.topDecks.length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-slate-700"><h2 className="font-semibold">No deck history yet</h2><p className="mt-1 text-sm">Refresh after {friendName} plays a standard 1v1 match.</p></div> : <>
        <nav aria-label="Most played decks" className="grid gap-2 sm:grid-cols-3">
          {summary.topDecks.map((deck, index) => <button key={deck.key} type="button" onClick={() => { setSelected(index); setError(''); }} aria-pressed={selected === index} className={`min-h-16 rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600 ${selected === index ? 'border-violet-600 bg-violet-50 ring-1 ring-violet-600' : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-slate-50'}`}>
            <span className="block text-sm font-bold text-slate-900">Deck {index + 1} · {deck.count} {deck.count === 1 ? 'match' : 'matches'}</span>
            <span className="mt-1 block truncate text-xs text-slate-600">{deck.cards.slice(0, 3).map(card => variants.find(variant => variant.key === `${card.id}:${Number(card.form ?? 0)}`)?.name ?? card.name ?? 'Card').join(' · ')}</span>
            <span className="mt-2 flex gap-1" aria-hidden="true">{deck.cards.slice(0, 4).map((card, cardIndex) => { const variant = variants.find(item => item.key === `${card.id}:${Number(card.form ?? 0)}`); return variant?.image ? <img key={`${card.id}-${cardIndex}`} src={variant.image} alt="" loading="lazy" className="h-12 w-9 rounded object-contain" /> : <span key={`${card.id}-${cardIndex}`} className="flex h-12 w-9 items-center justify-center rounded bg-slate-100 text-[9px] text-slate-500">{card.name?.slice(0, 2) ?? '?'}</span>; })}</span>
            <span className="mt-2 block text-xs font-medium text-violet-700">{Math.round(deck.share * 100)}% of recent history · See counter →</span>
          </button>)}
        </nav>
        {target ? <>
          <section className="rounded-2xl border border-slate-200 p-4 sm:p-5" aria-labelledby="played-deck-heading">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Deck {selected + 1}</p><h2 id="played-deck-heading" className="text-lg font-bold">Played {usage?.count} times</h2></div><span className="text-sm text-slate-600">{Math.round((usage?.share ?? 0) * 100)}% of recent matches</span></div>
            <DeckCards deck={target} variants={variants} />
          </section>
          <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 sm:p-5" aria-labelledby="counter-heading">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Suggested response</p><h2 id="counter-heading" className="mt-1 text-xl font-bold">A counter for this deck</h2><p className="mt-1 text-sm text-slate-600">Ranked by the matchup model. This is an estimate, not a measured win rate.</p></div>
            {scoring && <p role="status" className="mt-4 text-sm text-slate-600">Finding supported counter decks…</p>}
            {!scoring && !best?.deck && !error && <p className="mt-4 text-sm text-slate-600">No supported counter is available for this deck yet.</p>}
            {best?.deck && <div className="mt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Top counter candidate</h3><span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-violet-800">{Math.round((best.probability ?? 0) * 100)}% model estimate</span></div>
              <DeckCards deck={best.deck} variants={variants} />
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {exportUrl && <a href={exportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-orange-600 px-4 text-sm font-bold text-white hover:bg-orange-700">Open in Clash Royale</a>}
                <Link href={`/counter-deck?friendId=${encodeURIComponent(friendId)}&deck=${encodeURIComponent(usage?.key ?? '')}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-violet-300 bg-white px-4 text-sm font-semibold text-violet-800 hover:bg-violet-50">Explore more counters</Link>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-600">{CLASH_DECK_IMPORT_NOTICE}</p>
            </div>}
          </section>
        </> : <p className="rounded-xl bg-orange-50 p-4 text-sm text-orange-800">This deck uses a card form the model cannot score yet.</p>}
      </>}
    </>}
  </section>;
}
