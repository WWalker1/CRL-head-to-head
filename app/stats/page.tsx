import type { Metadata } from 'next';
import PlayerStatsView from '@/components/PlayerStatsView';

export const metadata: Metadata = {
  title: 'Player Stats | Rival Royale',
  description: 'Review recent model-favored losses, tough-matchup wins, and matchup skill.',
  alternates: { canonical: '/stats' },
  robots: { index: false, follow: false },
};

export default function StatsPage() {
  return <main className="min-h-[calc(100vh-73px)] bg-[#0d1024] px-4 py-8 text-slate-100 sm:px-6 sm:py-12 lg:px-8">
    <div className="mx-auto max-w-5xl"><span className="inline-flex rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">Rival Royale · player stats</span>
      <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">Your results against the model</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">See recent supported matchups where the model’s estimate and your result differed, alongside your model-relative skill score.</p>
      <PlayerStatsView />
    </div>
  </main>;
}
