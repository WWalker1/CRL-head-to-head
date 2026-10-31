import type { Metadata } from 'next';
import Link from 'next/link';
import SkillScoreExample from '@/components/SkillScoreExample';

export const metadata: Metadata = {
  title: 'How Matchup Skill Is Calculated: Worked Example',
  description: 'Try Rival Royale’s matchup skill calculation with a ten-game example. Understand expected wins, provisional scores, coverage and model limitations.',
  alternates: { canonical: '/guides/matchup-skill' },
};

export default function MatchupSkillGuide() {
  return <main className="min-h-screen bg-gradient-to-b from-violet-50 to-white px-4 py-10 text-slate-900 sm:px-6">
    <article className="mx-auto max-w-3xl">
      <Link href="/guides" className="inline-flex min-h-11 items-center font-semibold text-[#a73b13] underline underline-offset-4">← All guides</Link>
      <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">What does matchup skill measure?</h1>
      <p className="mt-5 text-lg leading-8 text-slate-600">Winning six of ten games can mean very different things against favorable and unfavorable decks. Rival Royale compares the results it recorded with a model’s estimates for those deck pairs. It is a way to inspect recent performance in context.</p>
      <section className="mt-9 space-y-4 leading-7 text-slate-700">
        <h2 className="text-2xl font-bold text-slate-950">From individual games to one score</h2>
        <p>For each supported, decisive game, a win contributes 1 actual win and a loss contributes 0. An estimated 70% win chance contributes 0.7 expected wins regardless of the result. Add those values across the scored games, then subtract expected wins from actual wins.</p>
        <p className="rounded-xl border border-slate-200 bg-white p-4 font-semibold text-slate-950">Score = 50 + 100 × (actual wins − expected wins) ÷ scored games</p>
        <p>The result is rounded to one decimal place and limited to 0–100. A score of 50 means results matched the model’s expectations over that sample. A score of 60 means the observed win rate was ten percentage points above the model’s expected rate. It does not mean you are in the top 40% of players.</p>
        <p>For example, six wins against five expected wins over ten games gives 60. The same six wins against seven expected wins gives 40. Those are hypothetical examples, not observations about a real player.</p>
      </section>
      <SkillScoreExample />
      <section className="mt-9 space-y-4 leading-7 text-slate-700">
        <h2 className="text-2xl font-bold text-slate-950">Which games count?</h2>
        <p>The recorded-history view starts with the latest 50 recorded constructed 1v1 matches. Draws do not count toward the score. A game also needs a supported deck pair, an eligible date after the model’s training cutoff, and a valid prediction from the current model version. Not every game in the record receives a prediction.</p>
        <p>Read the scored-game count alongside the score. Twenty scored matches out of a larger record describe those twenty matches, not every battle. The game API’s short recent log can leave gaps; a recorded history is not necessarily a complete history of your play.</p>
        <h2 className="pt-4 text-2xl font-bold text-slate-950">Why the provisional label matters</h2>
        <p>Fewer than 30 scored games is labeled provisional. With ten scored games, changing one loss to a win while keeping the same deck expectations adds ten score points. A sudden jump may reflect a small sample rather than a lasting change in ability. Crossing 30 games does not make the estimate certain.</p>
        <h2 className="pt-4 text-2xl font-bold text-slate-950">What the score cannot tell you</h2>
        <p>The model estimates deck matchups. It does not observe every decision, isolate opponent skill, or reliably quantify the effect of card-level gaps. Balance changes and unfamiliar decks can also make estimates less useful. A score above 50 is evidence of beating this model’s expectations in the recorded sample, not proof of superior player skill.</p>
        <p>If model estimates are unavailable, the app may show a recent record score instead. That separate calculation smooths the win rate with five additional wins and five losses; it does not adjust for deck difficulty. Compare like with like rather than treating the two numbers as interchangeable.</p>
        <h2 className="pt-4 text-2xl font-bold text-slate-950">Use it to choose a replay</h2>
        <p>A win with a low estimated chance or a loss with a high estimated chance is a useful starting point for review. Ask what happened in the replay before deciding that the deck or the model explains everything.</p>
        <Link href="/guides/review-a-matchup" className="inline-flex min-h-11 items-center font-semibold text-[#a73b13] underline underline-offset-4">Use the matchup review checklist →</Link>
      </section>
    </article>
  </main>;
}
