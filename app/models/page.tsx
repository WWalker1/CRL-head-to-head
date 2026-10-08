import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Model Methodology',
  description: 'How Rival Royale estimates Clash Royale deck matchups and searches for supported candidates.',
  alternates: { canonical: '/models' },
};

export default function ModelsPage() {
  return <main className="min-h-[calc(100vh-73px)] bg-[#0d1024] px-4 py-8 text-slate-100 sm:px-6 sm:py-12 lg:px-8">
    <article className="mx-auto max-w-6xl">
      <nav aria-label="Page navigation" className="mb-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
        <Link href="/" className="inline-flex min-h-11 items-center text-orange-300 underline-offset-4 hover:text-orange-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300">← Back to Rival Royale</Link>
        <Link href="/info" className="inline-flex min-h-11 items-center text-orange-300 underline-offset-4 hover:text-orange-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300">How it works</Link>
      </nav>

      <header className="grid items-center gap-8 lg:grid-cols-[1fr_0.9fr] lg:gap-12">
        <div>
          <span className="inline-flex rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">Rival Royale · methodology</span>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">How deck estimates work</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">Eight supported cards in. A model estimate out. Use it to compare ideas, not predict a guaranteed result.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/matchup" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-600 px-5 py-3 font-bold text-white transition hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200">Compare two decks</Link>
            <Link href="/counter-deck" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200">Find counter candidates</Link>
          </div>
        </div>

        <figure className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-950/70 via-slate-950 to-orange-950/40 p-5 shadow-2xl sm:p-7">
            <div role="img" className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 sm:gap-3" aria-label="Deck inputs pass through a model to produce a matchup estimate">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
              <p className="text-center text-xs font-bold uppercase tracking-wider text-violet-200">Deck A</p>
              <div aria-hidden="true" className="mt-3 grid grid-cols-2 gap-1.5">{Array.from({ length: 8 }, (_, index) => <span key={index} className="aspect-[4/5] rounded-md border border-white/10 bg-gradient-to-br from-violet-300/25 to-blue-950/70" />)}</div>
            </div>
            <span aria-hidden="true" className="text-xs font-black text-slate-500">VS</span>
            <div className="rounded-2xl border border-violet-300/20 bg-violet-400/[0.08] p-3 text-center sm:p-4">
              <span aria-hidden="true" className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-violet-300/15 text-xl font-black text-violet-200">ƒ</span>
              <p className="mt-3 text-xs font-bold leading-4 text-white sm:text-sm">Matchup model</p>
              <p className="mt-1 text-[10px] leading-4 text-slate-400 sm:text-xs">Supported inputs</p>
            </div>
            <span aria-hidden="true" className="text-lg text-orange-300">→</span>
            <div className="rounded-2xl border border-orange-300/20 bg-orange-400/[0.08] p-3 text-center sm:p-4">
              <span aria-hidden="true" className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-orange-200/20 text-lg font-black text-orange-200">≈</span>
              <p className="mt-3 text-xs font-bold leading-4 text-white sm:text-sm">Estimate</p>
              <p className="mt-1 text-[10px] leading-4 text-slate-400 sm:text-xs">With support notes</p>
            </div>
          </div>
          <figcaption className="mt-4 text-center text-xs text-slate-400">The estimate describes the model’s comparison, not a specific battle.</figcaption>
        </figure>
      </header>

      <section className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Model facts">
        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-wider text-violet-200">Input</p><h2 className="mt-2 font-bold text-white">Complete decks</h2><p className="mt-1 text-sm leading-5 text-slate-400">Eight distinct cards, forms, levels, and tower.</p></div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-wider text-orange-200">Search</p><h2 className="mt-2 font-bold text-white">Bounded candidates</h2><p className="mt-1 text-sm leading-5 text-slate-400">A limited search, not every legal deck.</p></div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-wider text-violet-200">Validation</p><h2 className="mt-2 font-bold text-white">57.77% accuracy</h2><p className="mt-1 text-sm leading-5 text-slate-400">On 48,638 held-out matches for this baseline.</p></div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-wider text-orange-200">Status</p><h2 className="mt-2 font-bold text-white">Model coverage</h2><p className="mt-1 text-sm leading-5 text-slate-400">Rare decks and balance drift need more review.</p></div>
      </section>

      <section className="mt-6 space-y-3" aria-label="Detailed model methodology">
        <details className="group rounded-2xl border border-white/10 bg-white/[0.03] px-4 sm:px-5">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 [&::-webkit-details-marker]:hidden">What goes into a matchup score<span aria-hidden="true" className="text-xl text-violet-200 transition-transform group-open:rotate-45">+</span></summary>
          <div className="max-w-4xl space-y-3 pb-5 text-sm leading-6 text-slate-300">
            <p>The frozen, calibrated two-layer attention model was trained on recorded Ranked-style matches. Inputs include card identity, Evolution or Hero form, card level, tower troop, and tower level. Deck order does not matter.</p>
            <p>The service validates eight distinct base cards and supported special-slot combinations before scoring. The model returns an estimate for a decisive match under supported inputs; it does not observe your starting hand, placements, timing, opponent skill, or decisions.</p>
          </div>
        </details>
        <details className="group rounded-2xl border border-white/10 bg-white/[0.03] px-4 sm:px-5">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 [&::-webkit-details-marker]:hidden">How counter search chooses candidates<span aria-hidden="true" className="text-xl text-violet-200 transition-transform group-open:rotate-45">+</span></summary>
          <div className="max-w-4xl space-y-3 pb-5 text-sm leading-6 text-slate-300">
            <p>Search starts from observed decks and explores legal card replacements within a fixed budget. It scores complete decks against the target or a frequency-weighted basket of historical decks and returns the strongest supported candidates it found.</p>
            <p>Because search is bounded, the result is not a globally optimal deck or a guarantee. Unusual combinations, rare cards, balance updates, card levels, tower troops, and player skill can all affect a real matchup. Support warnings are retained in service responses.</p>
          </div>
        </details>
        <details className="group rounded-2xl border border-white/10 bg-white/[0.03] px-4 sm:px-5">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 [&::-webkit-details-marker]:hidden">How to interpret the validation result<span aria-hidden="true" className="text-xl text-violet-200 transition-transform group-open:rotate-45">+</span></summary>
          <div className="max-w-4xl space-y-3 pb-5 text-sm leading-6 text-slate-300">
            <p>The two-layer attention model achieved 57.77% accuracy on 48,638 held-out matches in its evaluation. That is a test-set metric for this model version, not a forecast of your personal win rate or proof that every rare matchup is reliable.</p>
            <p>Further releases need checks for calibration, rare decks, and drift after balance changes. Use the tools to compare ideas, then make the decision based on your own cards and play.</p>
          </div>
        </details>
      </section>
    </article>
  </main>;
}
