import type { Metadata } from 'next';
import PlayerStatsView from '@/components/PlayerStatsView';

export const metadata: Metadata = {
  title: 'Matchup Skill | Rival Royale',
  description: 'See your model-relative matchup skill score and recent battle highlights.',
  alternates: { canonical: '/stats' },
  robots: { index: false, follow: false },
};

export default function StatsPage() {
  return <main className="min-h-[calc(100vh-73px)] bg-[#0d1024] px-4 py-8 text-slate-100 sm:px-6 sm:py-12 lg:px-8">
    <div className="mx-auto max-w-5xl"><span className="inline-flex rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">Rival Royale · matchup skill</span>
      <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">Your matchup skill</h1>
      <p className="mt-2 text-sm text-slate-300 sm:text-base">Your latest 100 recorded 1v1 games, compared with model expectations. See your best win and toughest loss below.</p>
      <PlayerStatsView />
    </div>
  </main>;
}
