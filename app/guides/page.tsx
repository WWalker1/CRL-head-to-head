import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Clash Royale Analysis Guides',
  description: 'Understand matchup skill, deck expectations and how to turn your recorded Clash Royale battles into a practical replay review.',
  alternates: { canonical: '/guides' },
};

export default function GuidesPage() {
  return <main className="min-h-screen bg-gradient-to-b from-violet-50 to-white px-4 py-12 text-slate-900 sm:px-6">
    <div className="mx-auto max-w-4xl">
      <p className="text-sm font-bold uppercase tracking-widest text-[#a73b13]">Rival Royale field guide</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Turn battle results into better questions</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">A record tells you what happened. A deck estimate adds context. These guides explain how to use both without treating a model as a verdict on your play.</p>
      <div className="mt-9 grid gap-5 sm:grid-cols-2">
        <Link href="/guides/matchup-skill" className="rounded-lg border border-stone-300 bg-white p-6 shadow-sm transition hover:border-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-700">
          <span className="text-xs font-bold uppercase tracking-wider text-[#a73b13]">Understand the score</span>
          <h2 className="mt-3 text-2xl font-bold">What matchup skill actually measures</h2>
          <p className="mt-3 leading-7 text-slate-600">Work through the calculation, try a ten-game example, and learn why a small sample or a model blind spot can change the interpretation.</p>
          <span className="mt-5 inline-block font-semibold text-[#a73b13]">Explore the score →</span>
        </Link>
        <Link href="/guides/review-a-matchup" className="rounded-lg border border-stone-300 bg-white p-6 shadow-sm transition hover:border-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-700">
          <span className="text-xs font-bold uppercase tracking-wider text-[#a73b13]">Use the analysis</span>
          <h2 className="mt-3 text-2xl font-bold">Review a matchup before changing your deck</h2>
          <p className="mt-3 leading-7 text-slate-600">Separate a tough matchup from a fixable decision. Use a repeatable checklist and test one change instead of chasing every loss.</p>
          <span className="mt-5 inline-block font-semibold text-[#a73b13]">Build a review habit →</span>
        </Link>
      </div>
      <p className="mt-8 leading-7 text-slate-600">No account is needed to read or try the examples. <Link href="/info" className="font-semibold text-[#a73b13] underline underline-offset-4">Learn how friend tracking works</Link> when you want a continuing record.</p>
    </div>
  </main>;
}
