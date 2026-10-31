import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import AdPlacement from "@/components/ads/AdPlacement";

export const metadata: Metadata = {
  title: "Track Clash Royale Wins Against Friends",
  description:
    "Track recorded Clash Royale wins and losses against friends. Add player tags, see head-to-head records, and explore deck counters.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Track Clash Royale Wins Against Friends | Rival Royale",
    description:
      "Add friends by player tag and see your recorded Clash Royale head-to-head results.",
  },
};

const steps = [
  {
    image: "/images/find-tag-step1.png",
    title: "Open your profile",
    description:
      "Tap your player name at the top of the Clash Royale home screen.",
  },
  {
    image: "/images/find-tag-step2.png",
    title: "Find your tag",
    description: "Your player tag appears below your name on your profile.",
  },
  {
    image: "/images/find-tag-step3.png",
    title: "Copy your tag",
    description: "Tap Copy Tag, then paste it when you create your account.",
  },
];
const faqs = [
  {
    question: "How can I track Clash Royale wins against friends?",
    answer:
      "Create an account with your Clash Royale player tag, add a friend’s tag, and sync eligible recent 1v1 battles available from the game API. Rival Royale summarizes recorded head-to-head results; available history may be limited.",
  },
  {
    question: "Is battle tracking automatic?",
    answer:
      "When tracking is enabled, recent eligible battles can be synced from the game API and refreshed from the dashboard. The API may omit older battles, so the tracker cannot promise a complete lifetime record.",
  },
  {
    question: "What types of battles are tracked?",
    answer:
      "The head-to-head tracker focuses on eligible 1v1 battles. Team battles and unsupported modes are excluded.",
  },
  {
    question: "Are deck matchup estimates guaranteed results?",
    answer:
      "No. Estimates are produced by a model for supported complete decks. They are not guarantees or a player’s personal win rate. In-game decisions, balance changes, and model coverage affect how useful they are.",
  },
  {
    question: "How do I know if I’m good at Clash Royale?",
    answer:
      "A win rate is one clue, but it depends on who you face and which decks you use. Rival Royale’s optional matchup skill view compares recorded results with supported deck estimates and highlights tough wins and favored losses. It is a model-relative snapshot, not a complete measure of skill.",
  },
  {
    question: "Am I better than my friend at Clash Royale?",
    answer:
      "Compare your recorded head-to-head wins and losses, then look at the decks each of you plays. If matchup skill is enabled, you can also compare each player’s model-relative performance. Available battle history may be incomplete, so the record is only as complete as the matches the game API provides.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  const publicLookup = process.env.PUBLIC_PLAYER_LOOKUP_ENABLED === "1";
  const modelTools = process.env.MODEL_TOOLS_ENABLED === "1";
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
  return (
    <main className="min-h-[calc(100vh-73px)] bg-[#f7f5ef] text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        <section
          aria-labelledby="home-heading"
          className="grid items-center gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12"
        >
          <div>
            <p className="rr-kicker">Rival Royale</p>
            <h1 id="home-heading" className="mt-3 rr-title">
              The score settles it.
              <br />
              The matchup explains it.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700">
              Track your games against friends. See who won, who had the deck
              advantage, and what to bring to the rematch.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={
                  publicLookup
                    ? "/clash-royale-skill-score#player-lookup"
                    : "/guides"
                }
                className="rr-button rr-button-primary"
              >
                {publicLookup
                  ? "Check recent performance"
                  : "Explore the free guides"}
              </Link>
              <Link href="/login" className="rr-button">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center font-semibold text-[#a73b13] underline underline-offset-4"
              >
                Start tracking friends
              </Link>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {publicLookup
                ? "No signup for a recent performance snapshot. Accounts save ongoing rivalries."
                : "Read the guides and try a skill example without signup. Accounts save ongoing rivalries."}{" "}
              Older matches may be unavailable.
            </p>
          </div>
          <figure className="rr-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <span className="rr-kicker">A rivalry, explained</span>
              <span className="rr-kicker">Example</span>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Player B</span>
                <span>Player A</span>
              </div>
              <div className="rr-score my-6 flex items-center justify-between text-6xl sm:text-7xl">
                <span>4</span>
                <span className="text-2xl text-stone-400">:</span>
                <span>6</span>
              </div>
              <div className="flex h-2 gap-1" aria-hidden="true">
                {Array.from({ length: 10 }, (_, i) => (
                  <span
                    key={i}
                    className={`flex-1 rounded-sm ${i < 4 ? "bg-[#c24719]" : "bg-stone-300"}`}
                  />
                ))}
              </div>
              <div className="mt-7 border-t border-stone-200 pt-5">
                <p className="rr-kicker">Beyond the win rate</p>
                <p className="mt-2 text-xl font-semibold">
                  B lost the series. B beat expectations.
                </p>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  With an estimated 20% chance in each matchup, B was expected
                  to win 2 games. Winning 4 puts B{" "}
                  <strong className="text-stone-900">
                    2 wins above expectation.
                  </strong>
                </p>
              </div>
            </div>
            <figcaption className="border-t border-stone-200 bg-[#efede5] px-6 py-3 text-xs leading-5 text-stone-600">
              Illustrative numbers. A short sample suggests an adjusted edge; it
              does not prove overall player skill.
            </figcaption>
          </figure>
        </section>
        <section
          className="mt-12 rounded-lg border border-stone-300 bg-white p-5 sm:p-7"
          aria-labelledby="public-guide-heading"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-[#a73b13]">
            Explore without an account
          </p>
          <h2 id="public-guide-heading" className="mt-2 text-2xl font-bold">
            What do your wins actually tell you?
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Try a worked matchup-skill example, learn why deck difficulty
            changes the interpretation of a win rate, and use a practical
            checklist to review your next replay.
          </p>
          <Link
            href="/guides"
            className="mt-3 inline-flex min-h-11 items-center font-semibold text-[#a73b13] underline underline-offset-4"
          >
            Explore the analysis guides →
          </Link>
        </section>
        <section
          className="mt-14 rounded-lg border border-stone-200 bg-white p-5  sm:p-8"
          aria-labelledby="tag-heading"
        >
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-orange-700">
            Get started
          </p>
          <h2
            id="tag-heading"
            className="mt-2 text-3xl font-bold tracking-tight text-slate-950"
          >
            Find your player tag in three steps
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            You’ll use your tag when you sign up, then add a friend’s tag to
            track your battles together.
          </p>
          <div className="mt-7 grid gap-8 lg:grid-cols-3 lg:gap-5">
            {steps.map((step, index) => (
              <div key={step.image} className="min-w-0">
                <div className="overflow-hidden rounded-xl border border-stone-200 bg-[#f4f0fb]">
                  <Image
                    src={step.image}
                    alt={`Step ${index + 1}: ${step.title} in Clash Royale`}
                    width={688}
                    height={566}
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="h-auto w-full"
                  />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  <span className="mr-2 text-[#a73b13]">{index + 1}.</span>
                  {step.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 rounded-xl bg-[#efede5] px-4 py-3 text-sm text-stone-950">
            A player tag starts with <strong>#</strong>. Copy it directly from
            the game so every character is correct.
          </p>
        </section>
        {modelTools ? (
          <section className="mt-14" aria-labelledby="tools-heading">
            <h2
              id="tools-heading"
              className="text-2xl font-bold tracking-tight"
            >
              Explore your decks
            </h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              Compare complete decks and explore possible counters for your next
              matchup.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Link
                href="/counter-deck"
                className="rounded-lg border border-orange-200 bg-orange-50 p-5 transition hover:border-orange-400 hover:shadow-md"
              >
                <strong className="block text-lg text-slate-950">
                  Find a counter deck →
                </strong>
                <span className="mt-1 block text-sm leading-6 text-slate-700">
                  Choose a target deck and see ranked candidate decks you can
                  export.
                </span>
              </Link>
              <Link
                href="/matchup"
                className="rounded-lg border border-stone-300 bg-[#efede5] p-5 transition hover:border-violet-400 hover:shadow-md"
              >
                <strong className="block text-lg text-slate-950">
                  Compare two decks →
                </strong>
                <span className="mt-1 block text-sm leading-6 text-slate-700">
                  See a model estimate for a complete deck matchup.
                </span>
              </Link>
            </div>
          </section>
        ) : null}
        <AdPlacement placement="home" />
        <section className="mt-14" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-bold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="mt-5 divide-y divide-stone-300 border-y border-stone-300">
            {faqs.map(({ question, answer }) => (
              <details key={question} className="py-4">
                <summary className="min-h-8 cursor-pointer font-semibold text-stone-900">
                  {question}
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
                  {answer}
                </p>
              </details>
            ))}
          </div>
          <p className="mt-5 text-sm text-slate-600">
            Learn more about{" "}
            <Link
              href={modelTools ? "/models" : "/guides/matchup-skill"}
              className="font-semibold text-[#a73b13] underline underline-offset-2"
            >
              model methodology and limitations
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
