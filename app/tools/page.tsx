import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clash Royale tools",
  description:
    "Find a counter, compare decks, and understand your recent Clash Royale performance.",
  alternates: { canonical: "/tools" },
};

export default function ToolsPage() {
  const model = process.env.MODEL_TOOLS_ENABLED === "1";
  const lookup = process.env.PUBLIC_PLAYER_LOOKUP_ENABLED === "1";
  const tools = [
    ...(model
      ? [
          {
            href: "/counter-deck",
            label: "01 / Prepare",
            title: "Find a counter",
            text: "Choose the deck you want to beat. Explore supported counters and take one into your next game.",
          },
          {
            href: "/matchup",
            label: "02 / Compare",
            title: "Test a matchup",
            text: "Put two complete decks side by side and see which starts with an advantage.",
          },
        ]
      : []),
    ...(lookup
      ? [
          {
            href: "/clash-royale-skill-score",
            label: "03 / Understand",
            title: "Check your performance",
            text: "See how your recent results compare with what your deck matchups predicted.",
          },
          {
            href: "/compare-players",
            label: "04 / Challenge",
            title: "Compare players",
            text: "Compare two recent performance snapshots with matching model and date coverage.",
          },
        ]
      : []),
  ];
  return (
    <main className="rr-page">
      <div className="rr-container py-12 sm:py-16">
        <p className="rr-kicker">The toolkit</p>
        <h1 className="rr-title mt-3">
          Go into the next game
          <br className="hidden sm:block" /> with a better read.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-stone-600">
          Simple tools for the questions behind the result.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="rr-tool-card group"
            >
              <p className="rr-kicker">{tool.label}</p>
              <h2 className="mt-6 text-2xl font-bold">
                {tool.title}{" "}
                <span
                  aria-hidden="true"
                  className="float-right text-orange-700 transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </h2>
              <p className="mt-3 max-w-md leading-7 text-stone-600">
                {tool.text}
              </p>
            </Link>
          ))}
        </div>
        <div className="mt-8 border-t border-stone-300 pt-6">
          <h2 className="font-bold">Make sense of the numbers</h2>
          <p className="mt-2 max-w-2xl leading-7 text-stone-600">
            Deck estimates describe a matchup, not a guaranteed outcome. Start
            with a worked example of expected wins and what they tell you.
          </p>
          <Link href="/guides" className="rr-button mt-4">
            Read the guides →
          </Link>
        </div>
      </div>
    </main>
  );
}
