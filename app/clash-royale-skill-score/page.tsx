import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Clash Royale Matchup Skill Score | Rival Royale',
  description: 'See how your recorded 1v1 wins compare with model estimates for your deck matchups.',
  alternates: { canonical: '/clash-royale-skill-score' },
};

export default function SkillScoreLandingPage() {
  return <main className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-orange-50 px-4 py-8 text-slate-900 sm:px-6 sm:py-14">
    <div className="mx-auto max-w-5xl">
      <div className="grid items-center gap-9 lg:grid-cols-[1fr_0.9fr] lg:gap-14">
        <div>
          <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-violet-800">Matchup skill</span>
          <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">How do your wins stack up?</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">See a score out of 100 based on how your recorded 1v1 results compare with the model&apos;s deck matchup estimates.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-700 px-6 font-bold text-white shadow-lg shadow-violet-700/20 hover:bg-violet-800">Sign up to see your score</Link><Link href="/stats" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-violet-300 bg-white px-5 font-semibold text-violet-800 hover:border-violet-500">Already signed in?</Link></div>
        </div>
        <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-2xl shadow-violet-200/70 sm:p-7" aria-label="Illustrative matchup skill example">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Illustrative example</p>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full p-2 sm:h-36 sm:w-36" style={{ background: 'conic-gradient(#f97316 64%, #ede9fe 64%)' }}><div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white"><span className="text-4xl font-black tabular-nums sm:text-5xl">64</span><span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">out of 100</span></div></div>
            <div className="min-w-0"><p className="text-sm font-bold text-violet-800">Results vs expectation</p><p className="mt-1 text-sm text-slate-600">A win in a tough matchup can lift your score more.</p></div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs font-bold uppercase text-emerald-800">Best win</p><p className="mt-1 text-sm font-semibold">Won with a 22% model chance</p></div><div className="rounded-xl bg-orange-50 p-3"><p className="text-xs font-bold uppercase text-orange-800">Toughest loss</p><p className="mt-1 text-sm font-semibold">Lost with a 78% model chance</p></div></div>
        </div>
      </div>
      <div className="mt-12 grid gap-3 sm:grid-cols-3"><p className="rounded-2xl border border-violet-100 bg-white p-4 text-sm text-slate-700"><strong className="block text-base text-slate-900">Sync your battles</strong>Latest 100 recorded constructed 1v1 games, across opponents.</p><p className="rounded-2xl border border-violet-100 bg-white p-4 text-sm text-slate-700"><strong className="block text-base text-slate-900">Compare results</strong>Supported deck matchups after the model training cutoff.</p><p className="rounded-2xl border border-violet-100 bg-white p-4 text-sm text-slate-700"><strong className="block text-base text-slate-900">Explore highlights</strong>Review your best win, toughest loss, and tracked friends.</p></div>
      <p className="mt-5 text-xs leading-5 text-slate-500">The score compares outcomes with deck estimates; it does not isolate player decisions or opponent skill. When estimates are unavailable, the app shows a recent record score.</p>
    </div>
  </main>;
}
