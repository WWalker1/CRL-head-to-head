import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Review a Clash Royale Matchup',
  description: 'A practical replay checklist for interpreting deck estimates, reviewing tough wins and favored losses, and testing a counter deck without overreacting to one game.',
  alternates: { canonical: '/guides/review-a-matchup' },
};

export default function MatchupReviewGuide() {
  const toolsEnabled = process.env.MODEL_TOOLS_ENABLED === '1';
  return <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white px-4 py-10 text-slate-900 sm:px-6">
    <article className="mx-auto max-w-3xl">
      <Link href="/guides" className="inline-flex min-h-11 items-center font-semibold text-[#a73b13] underline underline-offset-4">← All guides</Link>
      <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Review the matchup before changing your deck</h1>
      <p className="mt-5 text-lg leading-8 text-slate-600">A counter estimate helps you choose what to investigate. The replay helps you decide what to practice. Use this routine to turn one surprising result into a specific experiment.</p>
      <ol className="mt-9 space-y-8 leading-7 text-slate-700">
        <li><h2 className="text-2xl font-bold text-slate-950">1. Check what was compared</h2><p className="mt-3">Confirm all eight cards on each side, card forms and tower choices. A partial deck or the wrong variant is a different question. If your actual card levels differ, do not interpret an equal-level estimate as a reliable adjustment for that gap.</p></li>
        <li><h2 className="text-2xl font-bold text-slate-950">2. Treat the chance as context</h2><p className="mt-3">A 70% estimated win chance still leaves losses in the model’s picture. One loss does not disprove it, and one win does not validate it. The number is not your personal win rate or a claim that a particular card must always beat another.</p></li>
        <li><h2 className="text-2xl font-bold text-slate-950">3. Find the first costly decision</h2><p className="mt-3">Rewatch the opening and the first major damage exchange. Pause before the outcome is obvious. Note the cards available, the response you committed, and the option you gave up. Separate what you knew at that moment from what the full replay reveals.</p></li>
        <li><h2 className="text-2xl font-bold text-slate-950">4. Write one testable alternative</h2><p className="mt-3">“Play better” is hard to test. “Keep my primary answer available until their win condition is shown” is specific. Record the timestamp, your alternative and the tradeoff it creates. The alternative may still fail; the purpose is to learn what to watch for next time.</p></li>
        <li><h2 className="text-2xl font-bold text-slate-950">5. Change one thing and compare</h2><p className="mt-3">Try the decision change over several similar games before replacing multiple cards. If you test a new deck, compare complete decks and consider familiarity, upgrade cost and matchups beyond this single opponent. A deck selected to counter one opponent can be less useful elsewhere.</p></li>
      </ol>
      <section className="mt-9 rounded-lg border border-orange-200 bg-orange-50 p-5 sm:p-7">
        <h2 className="text-2xl font-bold text-slate-950">A worked review note</h2>
        <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-orange-900">Hypothetical example — not model evidence</p>
        <dl className="mt-4 space-y-4 leading-7 text-slate-700">
          <div><dt className="font-bold text-slate-950">Observation</dt><dd>I lost a game despite a 70% deck estimate. Before the deciding push, I spent my main defensive answer on a smaller threat.</dd></div>
          <div><dt className="font-bold text-slate-950">Alternative</dt><dd>Accept some early damage or use another response so that the main answer stays available for the larger threat.</dd></div>
          <div><dt className="font-bold text-slate-950">Next experiment</dt><dd>Keep the deck unchanged. In the next comparable games, note whether saving that response improves the defense and what damage it costs earlier.</dd></div>
          <div><dt className="font-bold text-slate-950">What this does not establish</dt><dd>It does not prove the estimate was correct or that this decision alone caused the loss. It creates a concrete question for the next replay.</dd></div>
        </dl>
      </section>
      <section className="mt-9 space-y-4 leading-7 text-slate-700">
        <h2 className="text-2xl font-bold text-slate-950">Use a counter recommendation carefully</h2>
        <p>The counter tool ranks supported candidate decks against the opposing deck you supplied. A top-ranked candidate is a starting point within that search, not proof that it is the best deck in the game. Check the complete list, forms and tower before testing it. The tool does not generate replay-specific coaching or identify the exact mistake that caused a loss.</p>
        <p>When tracking friends, inspect how often a deck was actually recorded and when it was last seen. A most-played deck is a summary of captured games; it may not be what your friend uses next.</p>
        <div className="flex flex-wrap gap-4">
          {toolsEnabled && <Link href="/counter-deck" className="inline-flex min-h-12 items-center rounded-xl bg-[#c24719] px-5 font-bold text-white hover:bg-[#a73b13]">Compare a counter deck</Link>}
          <Link href="/guides/matchup-skill" className="inline-flex min-h-12 items-center font-semibold text-[#a73b13] underline underline-offset-4">Understand matchup skill</Link>
        </div>
      </section>
    </article>
  </main>;
}
