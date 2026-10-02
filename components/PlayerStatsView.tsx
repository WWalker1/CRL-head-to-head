'use client';

import { useEffect, useState } from 'react';
import MatchupSkill from './MatchupSkill';
import type { MatchupSkillSummary } from '@/lib/matchup-skill';
import type { PlayerStats, MatchupHighlight } from '@/lib/player-stats';

type Payload = { stats: PlayerStats; skillStatus: string };

function Deck({ title, deck }: { title: string; deck: any }) {
  const cards = Array.isArray(deck?.cards) ? deck.cards : [];
  return <div className="min-w-0 rounded-xl border border-white/10 bg-slate-900/70 p-3">
    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h4>
    <p className="mt-2 text-sm leading-6 text-slate-100">{cards.map((card: any) => `${card.name || `Card ${card.id}`}${card.form && card.form !== '0' ? ' · special form' : ''}`).join(' · ') || 'Deck details unavailable'}</p>
    {(deck?.tower || deck?.towerLevel) && <p className="mt-1 text-xs text-slate-400">Tower {deck.tower || '—'}{deck.towerLevel ? ` · level ${deck.towerLevel}` : ''}</p>}
  </div>;
}

function MatchCard({ row }: { row: MatchupHighlight }) {
  const date = new Date(row.date);
  const dateLabel = Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
  return <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.result === 'win' ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'}`}>{row.result === 'win' ? 'WIN' : 'LOSS'}</span><time className="text-sm text-slate-400">{dateLabel}</time></div>
      <span className="text-sm font-semibold text-violet-200">Model estimate: {Math.round(row.expectedWinProbability * 100)}% win chance</span>
    </div>
    <div className="grid gap-3 sm:grid-cols-2"><Deck title="Your deck" deck={row.playerDeck} /><Deck title="Opponent deck" deck={row.opponentDeck} /></div>
  </article>;
}

function HighlightSection({ title, description, rows, empty }: { title: string; description: string; rows: MatchupHighlight[]; empty: string }) {
  return <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/50 p-4 sm:p-6">
    <div className="mb-4"><h2 className="text-xl font-bold text-white">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-400">{description}</p></div>
    {rows.length ? <div className="space-y-3">{rows.map(row => <MatchCard key={row.id} row={row} />)}</div> : <p className="rounded-xl bg-white/[0.04] p-4 text-sm text-slate-300">{empty}</p>}
  </section>;
}

export default function PlayerStatsView() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/player-history', { signal: controller.signal, credentials: 'same-origin' })
      .then(async response => { if (!response.ok) throw new Error(response.status === 401 ? 'Sign in to see your player stats.' : 'Stats are unavailable. Sync battles after history is configured.'); return response.json(); })
      .then(payload => setData(payload as Payload))
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message || 'Stats are unavailable right now.'); });
    return () => controller.abort();
  }, []);

  if (error) return <p role="alert" className="mt-8 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-100">{error}</p>;
  if (!data) return <p className="mt-8 text-sm text-slate-300" aria-live="polite">Loading your recent stats…</p>;

  const { stats, skillStatus } = data;
  const windowLabel = stats.firstMatch && stats.lastMatch
    ? `${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(stats.firstMatch))} – ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(stats.lastMatch))}`
    : 'No eligible recorded matches yet';

  return <>
    <section className="mt-7 rounded-3xl border border-white/10 bg-slate-950/50 p-4 sm:p-6">
      <MatchupSkill skill={stats.skill as MatchupSkillSummary} status={skillStatus} />
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-xs text-slate-400">Recent time window</p><p className="mt-1 font-medium text-white">{windowLabel}</p></div>
        <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-xs text-slate-400">Recorded / supported</p><p className="mt-1 font-medium text-white">{stats.windowMatches} / {stats.scoredMatches} matches</p></div>
        <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-xs text-slate-400">Model version</p><p className="mt-1 break-all font-medium text-white">{stats.modelVersion || 'Unavailable'}</p></div>
      </div>
    </section>
    <HighlightSection title="Model-favored losses" description="Your five most model-favored losses among the latest 100 recorded matches. Ranked by estimated win chance (at least 60%)." rows={stats.favorableLosses} empty="No supported losses at or above a 60% model win estimate in this recent window." />
    <HighlightSection title="Tough-matchup wins" description="Your five wins against the lowest estimated chances among the latest 100 recorded matches. A tough matchup is below 40%." rows={stats.toughWins} empty="No supported wins below a 40% model win estimate in this recent window." />
    <p className="mt-5 text-xs leading-5 text-slate-500">Estimates are model probabilities, not certainty or evidence that a result was a mistake. Records are included only when both decks have model support without low-support warnings; unsupported matches are excluded. Results reflect the current model version and its training coverage. The skill score is provisional below 30 scored matches and does not account for player skill, balance changes, or in-game decisions.</p>
  </>;
}
