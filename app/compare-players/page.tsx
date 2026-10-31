import type { Metadata } from "next";
import Link from "next/link";
import PlayerComparison from "@/components/PlayerComparison";

export const metadata: Metadata = {
  title: "Compare Clash Royale Players",
  description:
    "Compare two recent Clash Royale performance snapshots, with supported-game counts, dates and honest limits on what a small sample means.",
  alternates: { canonical: "/compare-players" },
};

export default function ComparePlayersPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50 to-white px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-widest text-[#a73b13]">
          Settle the rivalry. Start with the evidence.
        </p>
        <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
          How do your recent games compare?
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          Winning six out of ten games against difficult decks means something
          different from winning six favored matchups. Compare results with
          deck-model expectations, then look at how much evidence each player
          actually has.
        </p>
        {process.env.PUBLIC_PLAYER_LOOKUP_ENABLED === "1" ? (
          <PlayerComparison />
        ) : (
          <p className="mt-8 rounded-lg border border-stone-300 bg-white p-6">
            Player comparison is not available yet.{" "}
            <Link
              href="/guides/matchup-skill"
              className="font-semibold text-[#a73b13] underline"
            >
              Try the interactive score example
            </Link>{" "}
            to explore how the calculation works.
          </p>
        )}
        <section
          className="mt-10 grid gap-6 sm:grid-cols-3"
          aria-label="Reading a comparison"
        >
          <div>
            <h2 className="text-lg font-bold">Same model, different games</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Scores must use the same model and formula before showing a
              difference. Even then, opponents and decks differ, so the result
              is a descriptive comparison.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold">
              Small samples stay provisional
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              A recent battle log is short. One result can move a score sharply.
              We do not award an overall winner or turn a small point difference
              into a claim about player ability.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold">Build a record over time</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Accounts preserve recorded rivalries. A public snapshot does not
              enroll either player in tracking or reveal another account&apos;s
              private archive.
            </p>
          </div>
        </section>
        <Link
          href="/guides/matchup-skill"
          className="mt-8 inline-flex min-h-11 items-center font-semibold text-[#a73b13] underline"
        >
          Understand the score and its limitations
        </Link>
      </div>
    </main>
  );
}
