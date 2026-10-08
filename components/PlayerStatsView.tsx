'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MatchupSkill from './MatchupSkill';
import CardArtwork from './CardArtwork';
import { browserAuthHeaders } from '@/lib/browser-auth-headers';
import type { MatchupSkillSummary } from '@/lib/matchup-skill';
import type { MatchupHighlight, PlayerStats } from '@/lib/player-stats';

type Payload = { stats: PlayerStats; skillStatus: string; friend?: { friend_name?: string; friend_player_tag?: string } };
type HistoryCard = { id: string | number; name?: string | null; form?: string | number | null };
type HistoryDeck = { cards?: HistoryCard[]; tower?: string | null; towerLevel?: number | null } | null;

function Deck({ title, deck }: { title: string; deck: HistoryDeck }) {
  const cards = Array.isArray(deck?.cards) ? deck.cards : [];
  return <div className="min-w-0">
    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h4>
    {cards.length ? <div className="grid grid-cols-4 gap-1.5" aria-label={`${title} cards`}>{cards.slice(0, 8).map((card, index) => {
      return <CardArtwork key={`${card.id}-${card.form ?? 0}-${index}`} cardKey={`${card.id}:${Number(card.form ?? 0)}`} name={card.name} className="aspect-[4/5] rounded-md border border-white/10 bg-violet-950/70" fallbackClassName="text-violet-100" />;
    })}</div> : <p className="text-sm text-slate-400">Deck unavailable</p>}
  </div>;
}

function MatchCard({ row, compact = false, friend = false }: { row: MatchupHighlight; compact?: boolean; friend?: boolean }) {
  const date = new Date(row.date);
  const dateLabel = Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
  const win = row.result === 'win';
  return <article className={`rounded-2xl border p-4 ${win ? 'border-emerald-300/20 bg-emerald-400/[0.06]' : 'border-orange-300/20 bg-orange-400/[0.06]'}`}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${win ? 'bg-emerald-400/20 text-emerald-200' : 'bg-orange-400/20 text-orange-200'}`}>{win ? 'WIN' : 'LOSS'}</span>
      <div className="text-right"><p className="text-xl font-black tabular-nums text-white">{Math.round(row.expectedWinProbability * 100)}% <span className="text-xs font-medium text-slate-300">model chance</span></p>{dateLabel && <time className="text-xs text-slate-400">{dateLabel}</time>}</div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2"><Deck title={friend ? "Friend's deck" : 'Your deck'} deck={row.playerDeck as HistoryDeck} /><Deck title="Opponent" deck={row.opponentDeck as HistoryDeck} /></div>
    {!compact && <p className="mt-3 text-xs text-slate-400">The model estimate describes the deck matchup, not a guaranteed result.</p>}
  </article>;
}

function Highlight({ title, eyebrow, rows, empty, friend = false }: { title: string; eyebrow: string; rows: MatchupHighlight[]; empty: string; friend?: boolean }) {
  const [first, ...rest] = rows;
  return <section className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 sm:p-5">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-300">{eyebrow}</p>
    <h2 className="mb-4 mt-1 text-xl font-bold text-white">{title}</h2>
    {first ? <><MatchCard row={first} friend={friend} />{rest.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-violet-200">See {rest.length} more {first.result === 'win' ? 'wins' : 'losses'}</summary><div className="mt-3 space-y-3">{rest.map(row => <MatchCard key={row.id} row={row} compact friend={friend} />)}</div></details>}</> : <div className="flex min-h-32 items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">{empty}</div>}
  </section>;
}

export default function PlayerStatsView({ friendId }: { friendId?: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    browserAuthHeaders().then(headers => fetch(friendId ? `/api/friend-decks?friendId=${encodeURIComponent(friendId)}` : '/api/player-history', { signal: controller.signal, credentials: 'same-origin', headers }))
      .then(async response => { if (!response.ok) throw new Error(response.status === 401 ? 'Sign in to see player stats.' : response.status === 404 ? 'This friend is not in your tracked list.' : 'Stats are unavailable. Sync battles after history is configured.'); return response.json(); })
      .then(payload => setData(payload as Payload))
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message || 'Stats are unavailable right now.'); });
    return () => controller.abort();
  }, [friendId]);

  if (error) return <p role="alert" className="mt-8 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-100">{error}</p>;
  if (!data) return <p className="mt-8 text-sm text-slate-300" aria-live="polite">Loading recent stats…</p>;

  const { stats, skillStatus } = data;
  const windowLabel = stats.firstMatch && stats.lastMatch
    ? `${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(stats.firstMatch))} – ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(stats.lastMatch))}`
    : 'No games yet';

  return <div className="mt-6 space-y-5">
    {friendId && <header><Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-200 hover:text-white">← Back to friends</Link><span className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">Rival Royale · matchup skill</span><h1 className="mt-3 break-words text-3xl font-black tracking-tight text-white sm:text-5xl">{data.friend?.friend_name || 'Friend'}&apos;s matchup skill</h1><p className="mt-2 text-sm text-slate-300 sm:text-base">Their latest 100 recorded 1v1 games, compared with model expectations.</p>{data.friend?.friend_player_tag && <p className="mt-1 text-xs text-slate-400">{data.friend.friend_player_tag}</p>}</header>}
    <MatchupSkill skill={stats.skill as MatchupSkillSummary} status={skillStatus} dark subject={friendId ? 'Their' : 'Your'} />
    <div className="grid gap-4 lg:grid-cols-2">
      <Highlight title="Best win" eyebrow="Lowest model chance" rows={stats.toughWins} empty={`${friendId ? 'Their' : 'Your'} best win will appear after a supported match is scored.`} friend={Boolean(friendId)} />
      <Highlight title="Toughest loss" eyebrow="Highest model chance" rows={stats.favorableLosses} empty={`${friendId ? 'Their' : 'Your'} toughest loss will appear after a supported match is scored.`} friend={Boolean(friendId)} />
    </div>
    <details className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-xs leading-5 text-slate-400">
      <summary className="cursor-pointer font-semibold text-slate-200">About these stats</summary>
      <p className="mt-3">{stats.windowMatches} recent games · {stats.scoredMatches} model-supported · {windowLabel}. Highlights use the current model and the latest 100 stored games. Estimates describe deck matchups; player decisions, balance changes, and opponents can change a result.</p>
    </details>
  </div>;
}
