import type { Metadata } from "next";
import Link from "next/link";
import AdPlacement from "@/components/ads/AdPlacement";
import PublicPlayerLookup from "@/components/PublicPlayerLookup";

export const metadata: Metadata = {
  title: "Am I Good at Clash Royale? Free Skill Score",
  description:
    "Check your Clash Royale skill level for free. Compare recorded wins with deck matchup expectations, revisit tough wins, and see how you stack up against friends.",
  alternates: { canonical: "/clash-royale-skill-score" },
};

export default function SkillScoreLandingPage() {
  const publicLookup = process.env.PUBLIC_PLAYER_LOOKUP_ENABLED === "1";
  return (
    <main className="min-h-screen bg-[#f7f5ef] px-4 py-8 text-slate-900 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="grid items-center gap-9 lg:grid-cols-[1fr_0.9fr] lg:gap-14">
          <div>
            <span className="inline-flex rounded-full bg-[#eae6dc] px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-stone-800">
              Matchup skill
            </span>
            <h1 className="mt-4 max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              Are you good at Clash Royale?
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              See a score out of 100 based on how your recorded 1v1 results
              compare with deck matchup expectations. See the difference between
              winning a favorable matchup and outperforming a difficult one.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={publicLookup ? "#player-lookup" : "/signup"}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#c24719] px-6 font-bold text-white  hover:bg-[#a73b13]"
              >
                {publicLookup
                  ? "Check a player tag"
                  : "Sign up to see your score"}
              </Link>
              <Link
                href="/stats"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-5 font-semibold text-stone-800 hover:border-violet-500"
              >
                Already signed in?
              </Link>
            </div>
          </div>
          <div
            className="rounded-lg border border-stone-200 bg-white p-5  sm:p-7"
            aria-label="Illustrative matchup skill example"
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a73b13]">
              Illustrative example
            </p>
            <div className="mt-4 flex items-center gap-5">
              <div
                className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full p-2 sm:h-36 sm:w-36"
                style={{
                  background: "conic-gradient(#f97316 64%, #e6e2d8 64%)",
                }}
              >
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-4xl font-bold tabular-nums sm:text-5xl">
                    64
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#a73b13]">
                    out of 100
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-800">
                  Results vs expectation
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  A win in a tough matchup can lift your score more.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xs font-bold uppercase text-emerald-800">
                  Best win
                </p>
                <p className="mt-1 text-sm font-semibold">
                  Won with a 22% model chance
                </p>
              </div>
              <div className="rounded-xl bg-orange-50 p-3">
                <p className="text-xs font-bold uppercase text-orange-800">
                  Toughest loss
                </p>
                <p className="mt-1 text-sm font-semibold">
                  Lost with a 78% model chance
                </p>
              </div>
            </div>
          </div>
        </div>
        {publicLookup ? <PublicPlayerLookup /> : null}

        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-slate-700">
            <strong className="block text-base text-slate-900">
              {publicLookup ? "Check recent games" : "Sync your battles"}
            </strong>
            {publicLookup
              ? "Up to 25 eligible public games in a snapshot; account tracking keeps a separate latest-50 window."
              : "Latest 50 recorded constructed 1v1 games, across opponents."}
          </p>
          <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-slate-700">
            <strong className="block text-base text-slate-900">
              Compare results
            </strong>
            Supported deck matchups after the model training cutoff.
          </p>
          <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-slate-700">
            <strong className="block text-base text-slate-900">
              Explore highlights
            </strong>
            Review your best win, toughest loss, and tracked friends.
          </p>
        </div>
        <div className="mt-8 rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
          <h2 className="text-xl font-bold text-slate-950">
            Better than your friend?
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            Track your head-to-head wins and losses, then open their matchup
            advantage page to compare your direct games against deck
            expectations. Their most-played decks are one tap away when you want
            to find a counter.
          </p>
          <Link
            href="/signup"
            className="mt-3 inline-flex min-h-11 items-center font-semibold text-[#a73b13] underline underline-offset-2"
          >
            Start tracking friends →
          </Link>
        </div>
        <section className="mt-8 rounded-lg border border-stone-300 bg-[#efede5] p-5 sm:p-6">
          <h2 className="text-xl font-bold text-slate-950">
            Try the calculation before signing up
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Six wins can mean different things against tough and favorable
            decks. Explore a ten-game example, see the actual formula, and learn
            what a provisional score can and cannot tell you.
          </p>
          <Link
            href="/guides/matchup-skill"
            className="mt-3 inline-flex min-h-11 items-center font-semibold text-[#a73b13] underline underline-offset-4"
          >
            Explore the interactive skill guide →
          </Link>
        </section>
        <AdPlacement placement="skill" />
        <section
          className="mt-8 grid gap-3 sm:grid-cols-2"
          aria-label="Clash Royale skill questions"
        >
          <article className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">
              How do I know if I&apos;m good at Clash Royale?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Look beyond trophies or one win streak. Compare your results with
              the matchups you faced: winning a difficult deck matchup tells a
              different story from winning a favored one. Rival Royale shows
              your recent results against model expectations and highlights
              both.
            </p>
          </article>
          <article className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">
              How can I check my skill level in Clash Royale?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Add your player tag, sync eligible 1v1 battles, and open your free
              matchup skill score. The score uses supported games from your
              latest 50 recorded matches; it can move quickly with a small
              sample and does not measure every in-game decision.
            </p>
          </article>
        </section>
        <p className="mt-5 text-xs leading-5 text-slate-500">
          The score compares outcomes with deck estimates; it does not isolate
          player decisions or opponent skill. Public snapshots show the recent
          record when estimates are unavailable.
        </p>
      </div>
    </main>
  );
}
