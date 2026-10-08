'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { DeckUsage, FriendHistorySummary } from '@/lib/friend-history';
import { buildClashDeckLink, CLASH_DECK_IMPORT_NOTICE } from '@/lib/clash-deck-link';
import { counter } from './model-tools/api';
import type { Deck, ModelResult } from './model-tools/types';
import CardArtwork from './CardArtwork';
import { cardDisplay } from '@/lib/card-display';
import MatchupSkill from './MatchupSkill';
import type { MatchupSkillSummary } from '@/lib/matchup-skill';
import type { PlayerStats } from '@/lib/player-stats';
import RivalryShareControl from './RivalryShareControl';

function toModelDeck(usage: DeckUsage): Deck | null {
  if (usage.cards.length !== 8) return null;
  const cards = usage.cards.map(card => ({ key: `${card.id}:${Number(card.form ?? 0)}`, level: card.level ?? 16 }));
  if (cards.some(card => !/^[0-9]+:[012]$/.test(card.key))) return null;
  return { cards, tower_id: Number(usage.tower) || 159000000, tower_level: usage.towerLevel ?? 16 };
}

function Cards({ deck }: { deck: Deck }) {
  return <div className="grid grid-cols-4 gap-2" aria-label="Eight deck cards">{deck.cards.map((card, index) => <div key={`${card.key}-${index}`} className="min-w-0 overflow-hidden rounded-lg border border-blue-100 bg-blue-50 text-center"><CardArtwork cardKey={card.key} className="aspect-[3/4] w-full" fallbackClassName="text-blue-600" /><span className="block truncate px-1 py-1 text-[10px] text-gray-700">{cardDisplay(card.key).name}</span></div>)}</div>;
}

export default function FriendDeckExperience({ friendId, friendName, friendTag, compact = false }: { friendId: string; friendName?: string; friendTag?: string; compact?: boolean }) {
  const [summary, setSummary] = useState<FriendHistorySummary | null>(null);
  const [skill, setSkill] = useState<MatchupSkillSummary | null>(null);
  const [skillStatus, setSkillStatus] = useState('');
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [name, setName] = useState(friendName ?? 'Friend');
  const [selected, setSelected] = useState(0);
  const [result, setResult] = useState<ModelResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = async (method: 'GET' | 'POST', signal?: AbortSignal) => {
    const response = await fetch(method === 'GET' ? `/api/friend-decks?friendId=${encodeURIComponent(friendId)}` : '/api/friend-decks', { method, signal, credentials: 'same-origin', headers: method === 'POST' ? { 'content-type': 'application/json' } : {}, ...(method === 'POST' ? { body: JSON.stringify({ friendId }) } : {}) });
    if (!response.ok) throw new Error(response.status === 401 ? 'Sign in to see your friend’s decks.' : 'Friend history is unavailable. Check Supabase setup and try again.');
    let payload = await response.json();
    if (method === 'GET' && !payload.summary?.recordedMatches) {
      const latest = await fetch('/api/friend-decks', { method: 'POST', signal, credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ friendId }) });
      if (latest.ok) payload = await latest.json();
    }
    setSummary(payload.summary); setSkill(payload.skill ?? null); setSkillStatus(payload.skillStatus ?? ''); setStats(payload.stats ?? null); setName(payload.friend?.friend_name || friendName || 'Friend'); setSelected(0); setResult(null);
  };

  useEffect(() => {
    const controller = new AbortController();
    loadHistory('GET', controller.signal).then(() => {
      if (controller.signal.aborted) return;
      setLoading(false);
    }).catch(reason => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Could not load history.'); setLoading(false); } });
    return () => controller.abort();
  }, [friendId]);

  const usage = summary?.topDecks[selected];
  const target = useMemo(() => usage ? toModelDeck(usage) : null, [usage]);
  useEffect(() => {
    if (!target) return;
    const controller = new AbortController(); setScoring(true); setResult(null);
    counter(target, [], 16, target.tower_id, 16, controller.signal).then(setResult).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'The counter model is unavailable.'); }).finally(() => { if (!controller.signal.aborted) setScoring(false); });
    return () => controller.abort();
  }, [target]);

  const best = result?.candidates?.[0];
  let exportUrl: string | null = null;
  if (best?.deck) { try { exportUrl = buildClashDeckLink(best.deck); } catch { /* invalid model output stays unexportable */ } }
  const refresh = async () => { setLoading(true); setError(''); try { await loadHistory('POST'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not refresh history.'); } finally { setLoading(false); } };

  return <section className="space-y-4 text-gray-900" aria-label={`${name} deck and counter`}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className={`${compact ? 'text-base' : 'text-2xl'} font-bold`}>{name}&apos;s deck</h2><p className="text-xs text-gray-500">{friendTag || 'Recent recorded 1v1 matches'}</p></div><button type="button" onClick={refresh} disabled={loading} className="min-h-11 rounded-lg border border-blue-200 px-3 text-xs font-semibold text-blue-700 disabled:opacity-50">Refresh history</button></div>
    {loading && <p role="status" className="text-sm text-gray-600">Loading recorded decks…</p>}
    {error && <p role="alert" className="rounded-lg bg-orange-50 p-2 text-sm text-orange-800">{error}</p>}
    {!loading && skill && <><MatchupSkill skill={skill} status={skillStatus} />{stats && (stats.toughWins[0] || stats.favorableLosses[0]) && <div className="grid gap-2 sm:grid-cols-2" aria-label="Friend matchup highlights">{[{ title: 'Best win', row: stats.toughWins[0] }, { title: 'Toughest loss', row: stats.favorableLosses[0] }].map(({ title, row }) => <div key={title} className="rounded-lg border border-violet-100 bg-violet-50 p-3"><p className="text-xs font-bold uppercase tracking-wider text-violet-700">{title}</p><p className="mt-1 text-sm text-slate-700">{row ? `${Math.round(row.expectedWinProbability * 100)}% model matchup chance · ${new Date(row.date).toLocaleDateString()}` : 'No supported match yet'}</p></div>)}</div>}</>}
    {!loading && summary && <><RivalryShareControl friendId={friendId} friendName={name} /><p className="text-xs text-gray-600">Showing the latest {summary.recordedMatches} full match records (up to 100). Up to five decks are ranked across {summary.allTimeMatches} tracked matches since tracking began.</p>{summary.topDecks.length === 0 ? <p className="text-sm text-gray-600">No eligible deck history yet. Refresh after your friend plays a standard 1v1 match.</p> : <>
      {summary.topDecks.length > 1 && <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Most-played decks since tracking began">{summary.topDecks.map((deck, index) => <button type="button" key={deck.key} onClick={() => { setSelected(index); setError(''); }} aria-pressed={selected === index} className={`min-h-11 shrink-0 rounded-lg px-3 text-xs font-semibold ${selected === index ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-800'}`}>Deck {index + 1} · {deck.count} {deck.count === 1 ? 'match' : 'matches'}</button>)}</div>}
      {target ? <Cards deck={target} /> : <p className="text-sm text-orange-700">This deck has a form the model cannot score yet.</p>}
      <p className="text-xs text-gray-600">Played {usage?.count} of {summary.allTimeMatches} tracked matches ({Math.round((usage?.share ?? 0) * 100)}%) since tracking began.</p>
      <div className="border-t border-blue-100 pt-3"><h3 className="text-base font-bold text-blue-900">Best model counter</h3>{scoring && <p role="status" className="mt-2 text-sm text-gray-600">Finding a supported counter…</p>}{best?.deck && <><p className="my-2 text-sm text-gray-700">Estimated matchup: {Math.round((best.probability ?? 0) * 100)}% · {best.support ?? 'model candidate'}</p><Cards deck={best.deck} /><div className="mt-3 flex flex-col gap-2 sm:flex-row">{exportUrl && <a href={exportUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center rounded-lg bg-orange-600 px-4 text-sm font-bold text-white hover:bg-orange-700">Export to Clash Royale</a>}<Link href={`/friend-decks/${encodeURIComponent(friendId)}`} className="flex min-h-11 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-semibold text-blue-800">View deck page</Link></div><p className="mt-2 text-xs text-gray-500">Model estimate, not a measured win rate. {CLASH_DECK_IMPORT_NOTICE}</p></>}</div>
      {!compact && <Link href={`/counter-deck?friendId=${encodeURIComponent(friendId)}&deck=${encodeURIComponent(usage?.key ?? '')}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 underline">Explore more counter options</Link>}
    </>}</>}
    {compact && <Link href={`/friend-decks/${encodeURIComponent(friendId)}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 underline">Open full deck page</Link>}
  </section>;
}
