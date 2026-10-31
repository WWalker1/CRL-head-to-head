'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { normalizePlayerTag } from '@/lib/player-tag';
import { requestPublicSnapshot } from '@/lib/public-snapshot-client';
import { comparePlayerSnapshots } from '@/lib/player-comparison';
import type { PublicPlayerSnapshot } from '@/lib/public-player-types';

function date(value?: string | null) { return value ? new Date(value).toLocaleString() : 'Unavailable'; }

export default function PlayerComparison() {
  const [tags, setTags] = useState(['', '']);
  const [results, setResults] = useState<PublicPlayerSnapshot[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);

  async function compare(event: FormEvent) {
    event.preventDefault();
    const normalized = tags.map(normalizePlayerTag);
    setResults(null); setError('');
    if (normalized.some(tag => !tag)) { setError('Enter both player tags from the game profiles.'); return; }
    if (normalized[0] === normalized[1]) { setError('Choose two different players.'); return; }
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setLoading(true);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 25000);
    try {
      const snapshots = await Promise.all(normalized.map(tag => requestPublicSnapshot('player', tag!, controller.signal)));
      if (!controller.signal.aborted) setResults(snapshots);
    } catch (reason) {
      if (active.current === controller && (!controller.signal.aborted || timedOut)) setError(timedOut ? 'The comparison took too long. Please try again shortly.' : reason instanceof Error ? reason.message : 'Comparison unavailable.');
      controller.abort();
    } finally { clearTimeout(timer); if (active.current === controller) setLoading(false); }
  }

  const comparison = results ? comparePlayerSnapshots(results[0], results[1]) : null;
  return <section className="mt-8 rounded-lg border border-stone-300 bg-white p-5 sm:p-8" aria-labelledby="compare-form-heading">
    <h2 id="compare-form-heading" className="text-2xl font-bold">Bring two player tags.</h2>
    <p className="mt-3 text-sm leading-6 text-slate-600">Two recent public snapshots, up to 25 eligible games each. No signup or ongoing tracking. Each lookup uses the shared free lookup allowance.</p>
    <form onSubmit={compare} className="mt-5 grid gap-4 sm:grid-cols-2">
      {tags.map((tag, index) => <label key={index} className="font-semibold">{index === 0 ? 'Your player tag' : 'Friend player tag'}<input required maxLength={16} autoComplete="off" autoCapitalize="characters" spellCheck={false} value={tag} onChange={event => { setResults(null); setTags(current => current.map((value, at) => at === index ? event.target.value : value)); }} className="ph-no-capture mt-2 block min-h-12 w-full rounded-xl border border-slate-300 px-4 uppercase" placeholder={index === 0 ? '#P0YQ' : '#P0Y2'} disabled={loading} /></label>)}
      <button disabled={loading} className="min-h-12 rounded-xl bg-[#c24719] px-6 font-bold text-white disabled:opacity-60 sm:col-span-2">{loading ? 'Comparing recent games…' : 'Compare recent performance'}</button>
    </form>
    <div aria-live="polite" aria-busy={loading}>
      {error ? <p role="alert" className="mt-5 rounded-xl bg-orange-50 p-4 text-orange-900">{error}</p> : null}
      {results && comparison ? <div className="mt-6 space-y-5">
        <div className="rounded-lg bg-[#efede5] p-5"><h3 className="text-xl font-bold">{comparison.title}</h3><p className="mt-2 text-sm leading-6">{comparison.explanation}</p>{comparison.difference !== null ? <p className="mt-2 font-semibold">Your displayed score minus your friend&apos;s: {comparison.difference > 0 ? '+' : ''}{comparison.difference} points.</p> : null}</div>
        <div className="grid gap-4 sm:grid-cols-2">{results.map((result, index) => <article key={result.playerTag} className="min-w-0 rounded-lg border border-slate-200 p-5">
          <p className="text-sm font-semibold text-[#a73b13]">{index === 0 ? 'You' : 'Friend'}</p><h3 className="mt-1 break-all text-xl font-bold">{result.playerTag}</h3>
          <p className="mt-4 text-4xl font-bold">{result.score === null ? 'Unavailable' : `${result.score}/100`}</p><p className="mt-2 text-sm">{result.scoredGames} supported games · provisional snapshot</p>
          <p className="mt-4 font-semibold">Recent record: {result.wins}W / {result.losses}L</p><p className="text-sm text-slate-600">{result.eligibleGames} eligible decisive games from {result.availableGames} available records.</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">Scored window: {date(result.scoredFirstMatch)} to {date(result.scoredLastMatch)}.</p>
          <p className="mt-2 text-xs text-slate-500">Fetched {date(result.fetchedAt)}. Reused for up to five minutes.</p>
        </article>)}</div>
        <p className="text-sm leading-6 text-slate-600">This does not reconstruct games against each other, prove account ownership, or compare a representative global ranking. <Link href="/signup" className="font-semibold text-[#a73b13] underline">Create an account to track an ongoing rivalry.</Link></p>
      </div> : null}
    </div>
  </section>;
}
