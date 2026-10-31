import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Rival Royale",
  description:
    "Why Rival Royale exists, how its analysis works, and how to report a problem or suggest an improvement.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f7f5ef] px-4 py-12 text-slate-900">
      <article className="mx-auto max-w-3xl space-y-8 rounded-lg bg-white p-6 shadow-sm sm:p-10">
        <header>
          <p className="text-sm font-bold uppercase tracking-widest text-[#a73b13]">
            About Rival Royale
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Give your rivalries a record.
          </h1>
          <p className="mt-4 leading-7 text-slate-600">
            Rival Royale helps Clash Royale players keep track of recorded games
            against friends and put results in context with deck matchup
            analysis.
          </p>
        </header>
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">
            What makes the analysis useful?
          </h2>
          <p className="leading-7">
            A win rate alone cannot tell you how favorable your decks were. Our
            model compares supported deck pairs; the matchup skill view compares
            recorded results with those estimates. Neither can tell you exactly
            why a game was won.
          </p>
          <p className="leading-7">
            The game API supplies a limited recent battle log. Tracking starts
            with the records available to us and can miss games between
            captures. We show the available sample rather than promise a
            complete lifetime history.
          </p>
          <Link
            href="/guides/matchup-skill"
            className="inline-flex min-h-11 items-center font-semibold text-[#a73b13] underline"
          >
            Explore a worked skill example
          </Link>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Feedback and bug reports</h2>
          <p className="leading-7">
            Report a reproducible bug or suggest a feature through the
            project&apos;s GitHub issue tracker. Include the page, device, what
            you expected, and what happened. GitHub may require an account to
            submit an issue.
          </p>
          <a
            href="https://github.com/WWalker1/CRL-head-to-head/issues"
            className="inline-flex min-h-11 items-center font-semibold text-[#a73b13] underline"
          >
            Open the project issue tracker
          </a>
          <p className="text-sm leading-6 text-slate-600">
            Issues are public. Do not post passwords, account emails,
            authentication links or private records.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Independent fan project</h2>
          <p className="leading-7">
            Rival Royale is not affiliated with, endorsed, sponsored or
            specifically approved by Supercell. Clash Royale and its game assets
            belong to Supercell. This is an independent companion, not an
            official game service.
          </p>
          <p className="leading-7">
            See Supercell&apos;s{" "}
            <a
              href="https://supercell.com/en/fan-content-policy/"
              className="text-[#a73b13] underline"
            >
              Fan Content Policy
            </a>{" "}
            and our{" "}
            <Link href="/privacy" className="text-[#a73b13] underline">
              privacy information
            </Link>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
