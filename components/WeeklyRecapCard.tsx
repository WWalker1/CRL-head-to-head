import Link from 'next/link';
import type { WeeklyRecap } from '@/lib/weekly-recap';

export default function WeeklyRecapCard({ recap, friend = false }: { recap: WeeklyRecap; friend?: boolean }) {
  return <section className="rounded-lg border border-violet-300/20 bg-violet-500/10 p-5 text-slate-100 sm:p-7" aria-labelledby="weekly-recap-heading">
    <p className="text-xs font-bold uppercase tracking-widest text-stone-300">A reason to check back</p>
    <h2 id="weekly-recap-heading" className="mt-2 text-2xl font-bold">{friend ? 'Their' : 'Your'} recorded last seven days</h2>
    <p className="mt-2 text-xs leading-6 text-slate-300">{new Date(recap.from).toLocaleString()} to {new Date(recap.through).toLocaleString()}</p>
    {recap.recordedGames ? <>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div><p className="text-sm text-stone-300">Recorded results</p><p className="mt-1 text-3xl font-black">{recap.wins}W / {recap.losses}L</p><p className="mt-1 text-xs text-slate-300">{recap.draws} draws · {recap.recordedGames} retained games</p></div>
        <div><p className="text-sm text-stone-300">Wins above expectation</p><p className="mt-1 text-3xl font-black">{recap.winsAboveExpected === null ? 'Unavailable' : recap.winsAboveExpected.toFixed(1)}</p><p className="mt-1 text-xs text-slate-300">{recap.scoredGames} current-model supported games</p></div>
        <div><p className="text-sm text-stone-300">Toughest modeled win</p><p className="mt-1 text-3xl font-black">{recap.toughestWin ? `${Math.round(recap.toughestWin.probability * 100)}%` : 'None recorded'}</p><p className="mt-1 text-xs text-slate-300">{recap.toughestWin ? 'Estimated deck chance before the result' : 'Requires a scored win below 40% expected chance'}</p></div>
      </div>
      <Link href="/guides/review-a-matchup" className="mt-5 inline-flex min-h-11 items-center font-semibold text-stone-300 underline">Choose one replay to review next</Link>
    </> : <p className="mt-5 text-sm leading-7 text-slate-300">No retained eligible games in this period. Sync after playing to capture what is still available from the game API. Older missing games cannot be recovered from this recap.</p>}
    <p className="mt-4 text-xs leading-6 text-slate-400">This summarizes captured records, not every game played. The API window and gaps between syncs can omit matches.{recap.retentionLimitReached ? ' The latest-50 retention limit is reached, so this week may also have been truncated.' : ''} No previous-week improvement is inferred from unequal samples.</p>
  </section>;
}
