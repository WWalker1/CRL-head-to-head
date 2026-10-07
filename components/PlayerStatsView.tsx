'use client';

import { useEffect, useState } from 'react';
import MatchupSkill from './MatchupSkill';
import { fetchCatalog } from './model-tools/api';
import type { CatalogVariant, ModelCatalog } from './model-tools/types';
import type { MatchupSkillSummary } from '@/lib/matchup-skill';
import type { MatchupHighlight, PlayerStats } from '@/lib/player-stats';

type Payload = { stats: PlayerStats; skillStatus: string };
type HistoryCard = { id: string | number; name?: string | null; form?: string | number | null };
type HistoryDeck = { cards?: HistoryCard[]; tower?: string | null; towerLevel?: number | null } | null;

function Deck({ title, deck, variants }: { title: string; deck: HistoryDeck; variants: CatalogVariant[] }) {
  const cards = Array.isArray(deck?.cards) ? deck.cards : [];
  const lookup = new Map(variants.map(variant => [variant.key, variant]));
  return <div className="min-w-0">
    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h4>
    {cards.length ? <div className="grid grid-cols-4 gap-1.5" aria-label={`${title} cards`}>{cards.slice(0, 8).map((card, index) => {
      const variant = lookup.get(`${card.id}:${Number(card.form ?? 0)}`);
      const name = variant?.name ?? card.name ?? `Card ${card.id}`;
      return <div key={`${card.id}-${index}`} title={name} aria-label={name} className="flex aspect-[4/5] min-w-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-violet-950/70">{variant?.image ? <img src={variant.image} alt="" loading="lazy" className="h-full w-full object-contain" /> : <span className="break-words px-1 text-center text-[9px] leading-tight text-violet-100">{name}</span>}</div>;
    })}</div> : <p className="text-sm text-slate-400">Deck unavailable</p>}
  </div>;
}

function MatchCard({ row, variants, compact = false }: { row: MatchupHighlight; variants: CatalogVariant[]; compact?: boolean }) {
  const date = new Date(row.date);
  const dateLabel = Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
  const win = row.result === 'win';
  return <article className={`rounded-2xl border p-4 ${win ? 'border-emerald-300/20 bg-emerald-400/[0.06]' : 'border-orange-300/20 bg-orange-400/[0.06]'}`}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${win ? 'bg-emerald-400/20 text-emerald-200' : 'bg-orange-400/20 text-orange-200'}`}>{win ? 'WIN' : 'LOSS'}</span>
      <div className="text-right"><p className="text-xl font-black tabular-nums text-white">{Math.round(row.expectedWinProbability * 100)}% <span className="text-xs font-medium text-slate-300">model chance</span></p>{dateLabel && <time className="text-xs text-slate-400">{dateLabel}</time>}</div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2"><Deck title="Your deck" deck={row.playerDeck as HistoryDeck} variants={variants} /><Deck title="Opponent" deck={row.opponentDeck as HistoryDeck} variants={variants} /></div>
    {!compact && <p className="mt-3 text-xs text-slate-400">The model estimate describes the deck matchup, not a guaranteed result.</p>}
  </article>;
}

function Highlight({ title, eyebrow, rows, empty, variants }: { title: string; eyebrow: string; rows: MatchupHighlight[]; empty: string; variants: CatalogVariant[] }) {
  const [first, ...rest] = rows;
  return <section className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 sm:p-5">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-300">{eyebrow}</p>
    <h2 className="mb-4 mt-1 text-xl font-bold text-white">{title}</h2>
    {first ? <><MatchCard row={first} variants={variants} />{rest.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-violet-200">See {rest.length} more {first.result === 'win' ? 'wins' : 'losses'}</summary><div className="mt-3 space-y-3">{rest.map(row => <MatchCard key={row.id} row={row} variants={variants} compact />)}</div></details>}</> : <div className="flex min-h-32 items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">{empty}</div>}
  </section>;
}

export default function PlayerStatsView() {
  const [data, setData] = useState<Payload | null>(null);
  const [variants, setVariants] = useState<CatalogVariant[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/player-history', { signal: controller.signal, credentials: 'same-origin' })
      .then(async response => { if (!response.ok) throw new Error(response.status === 401 ? 'Sign in to see your player stats.' : 'Stats are unavailable. Sync battles after history is configured.'); return response.json(); })
      .then(payload => setData(payload as Payload))
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message || 'Stats are unavailable right now.'); });
    fetchCatalog(controller.signal).then((payload: ModelCatalog & { catalog?: ModelCatalog; data?: ModelCatalog }) => {
      const catalog = payload.catalog ?? payload.data ?? payload;
      if (!controller.signal.aborted && Array.isArray(catalog.variants)) setVariants(catalog.variants);
    }).catch(() => {});
    return () => controller.abort();
  }, []);

  if (error) return <p role="alert" className="mt-8 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-100">{error}</p>;
  if (!data) return <p className="mt-8 text-sm text-slate-300" aria-live="polite">Loading your recent stats…</p>;

  const { stats, skillStatus } = data;
  const windowLabel = stats.firstMatch && stats.lastMatch
    ? `${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(stats.firstMatch))} – ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(stats.lastMatch))}`
    : 'No games yet';

  return <div className="mt-6 space-y-5">
    <MatchupSkill skill={stats.skill as MatchupSkillSummary} status={skillStatus} dark />
    <div className="grid gap-4 lg:grid-cols-2">
      <Highlight title="Best win" eyebrow="Lowest model chance" rows={stats.toughWins} empty="Your best win will appear after a supported match is scored." variants={variants} />
      <Highlight title="Toughest loss" eyebrow="Highest model chance" rows={stats.favorableLosses} empty="Your toughest loss will appear after a supported match is scored." variants={variants} />
    </div>
    <details className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-xs leading-5 text-slate-400">
      <summary className="cursor-pointer font-semibold text-slate-200">About these stats</summary>
      <p className="mt-3">{stats.windowMatches} recent games · {stats.scoredMatches} model-supported · {windowLabel}. Highlights use the current model version and the latest 100 stored games. Estimates describe deck matchups; player decisions, balance changes, and opponents can change a result. {stats.modelVersion ? `Model: ${stats.modelVersion}.` : ''}</p>
    </details>
  </div>;
}
