import type { Metadata } from 'next';
import Link from 'next/link';

const pageUrl = '/clash-royale-counter-deck-finder';
const siteBaseUrl = (process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')).replace(/\/$/, '');
const canonicalUrl = `${siteBaseUrl}${pageUrl}`;

export const metadata: Metadata = {
  title: 'Clash Royale Deck Builder & Counter Finder Guide',
  description: 'Learn how to use Rival Royale’s Clash Royale deck builder and counter finder. Compare counter decks, understand matchup estimates, and treat predictions as guidance rather than guarantees.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'article',
    title: 'Clash Royale Deck Builder & Counter Finder | Rival Royale',
    description: 'A practical guide to choosing a target deck, exploring counter candidates, and reading Clash Royale matchup estimates.',
  },
  twitter: {
    card: 'summary',
    title: 'Clash Royale Deck Builder & Counter Finder',
    description: 'Build and compare counter deck candidates with clear explanations of what matchup estimates mean.',
  },
};

const faqs = [
  {
    question: 'How do I find decks in Clash Royale?',
    answer: 'Start with a complete example deck or choose the eight cards in a deck you want to beat. Rival Royale finds ranked candidate counter decks for that target, shows all eight cards, and lets you export one to Clash Royale. The tool is free; it does not rank every deck in the game.',
  },
  {
    question: 'How do I find counter decks?',
    answer: 'Enter the opponent’s full eight-card deck in the counter finder and select Find counters. Review the complete candidate decks and their matchup estimates, then export one you want to try. The search compares a bounded set of candidates.',
  },
  {
    question: 'How do I know how to counter a deck?',
    answer: 'Identify the opponent’s win condition, support cards, and pressure pattern. Check whether your deck can defend those threats, cycle back to key answers, and turn defense into a counter-push. A favorable deck estimate is a starting point; placement, timing, card levels, and the opponent’s decisions still matter.',
  },
  {
    question: 'What is a Clash Royale counter deck?',
    answer: 'A counter deck is a deck chosen to address the threats and game plan of a particular opposing deck. A useful response considers how its cards defend, create counter-pushes, and handle multiple threats; one favorable interaction alone does not guarantee a favorable full match.',
  },
  {
    question: 'How does the Rival Royale counter deck finder work?',
    answer: 'Choose the eight cards in a target deck, then ask the finder to compare supported candidate decks against it. Search is bounded and heuristic: it evaluates a limited candidate set rather than every legal deck. You can lock cards that you want to keep in candidate decks.',
  },
  {
    question: 'Are suggested counter decks guaranteed to win?',
    answer: 'No. Suggestions are model-ranked candidates, not guaranteed counters. Match outcomes depend on player decisions, starting hands, card levels, tower troops, balance changes, and other conditions that a deck-only estimate may not capture.',
  },
  {
    question: 'Is a matchup estimate the deck’s observed win rate?',
    answer: 'No. It is a model estimate for a decisive match under the supported inputs. It is not a measured win rate for your account, a live ladder ranking, or a promise about an individual battle.',
  },
  {
    question: 'What should I do after finding a promising deck?',
    answer: 'Check that the deck fits your card collection and play style, compare its complete-deck matchup, and practice its defense and rotation. Use a candidate as a starting point and reassess it after meaningful balance changes.',
  },
  {
    question: 'How do I know if my Clash Royale deck is good?',
    answer: 'Look at how the full deck handles common threats, supports its win condition, and fits your levels and play style. Rival Royale can compare supported complete decks and rank a limited set of counter candidates, but its estimates are model guidance rather than observed win rates or guarantees.',
  },
];

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${canonicalUrl}#webpage`,
      name: 'Clash Royale Deck Builder and Counter Finder Guide',
      description: 'An evidence-based guide to counter deck building and model-estimated Clash Royale matchups.',
      isPartOf: { '@type': 'WebSite', name: 'Rival Royale' },
      mainEntity: { '@id': `${canonicalUrl}#article` },
    },
    {
      '@type': 'Article',
      '@id': `${canonicalUrl}#article`,
      headline: 'How to Build and Compare Clash Royale Counter Decks',
      description: 'Learn a practical process for assessing target decks, candidate counters, and matchup estimates.',
      author: { '@type': 'Organization', name: 'Rival Royale' },
      publisher: { '@type': 'Organization', name: 'Rival Royale' },
      mainEntityOfPage: { '@id': `${canonicalUrl}#webpage` },
    },
    {
      '@type': 'FAQPage',
      '@id': `${canonicalUrl}#faq`,
      mainEntity: faqs.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ],
};

const linkClass = 'font-semibold text-violet-200 underline decoration-violet-400/70 underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300';

export default function ClashRoyaleCounterDeckFinderPage() {
  return (
    <main className="min-h-screen bg-[#0d1024] text-slate-200">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <article className="mx-auto max-w-6xl px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pt-14">
        <header className="grid items-center gap-8 lg:grid-cols-[1fr_0.9fr] lg:gap-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">Rival Royale · Deck strategy</p>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">Clash Royale deck builder and counter finder</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">Choose a target deck. Compare complete counter candidates. Keep the final call yours.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/counter-deck" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-500 px-5 py-3 font-bold text-white shadow-lg shadow-orange-950/30 transition hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200">Open counter finder</Link>
              <Link href="/matchup" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300">Compare two decks</Link>
            </div>
          </div>

          <div role="img" aria-label="A complete target deck is compared with candidate decks" className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-950/80 via-slate-950 to-orange-950/60 p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-wider text-violet-200">Your target</p><p className="mt-1 font-bold text-white">Complete deck</p></div>
              <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-sm font-black text-orange-200">VS</span>
              <div className="text-right"><p className="text-xs font-bold uppercase tracking-wider text-orange-200">Candidates</p><p className="mt-1 font-bold text-white">Compare & choose</p></div>
            </div>
            <div className="mt-6 grid grid-cols-4 gap-2" aria-hidden="true">
              {['Win condition', 'Support', 'Defense', 'Spell', 'Cycle', 'Pressure', 'Air answer', 'Flex slot'].map((role, index) => <div key={role} className={`flex aspect-[4/5] items-end rounded-lg border border-white/10 bg-gradient-to-br ${index % 2 === 0 ? 'from-violet-400/25 to-blue-950' : 'from-orange-300/20 to-slate-950'} p-1.5 sm:rounded-xl sm:p-2`}><span className="text-[9px] font-semibold leading-tight text-slate-200 sm:text-[11px]">{role}</span></div>)}
            </div>
            <p className="mt-4 text-center text-xs text-slate-400">A matchup is more than one card interaction.</p>
          </div>
        </header>

        <section className="mt-10 grid gap-3 sm:grid-cols-3" aria-label="Three steps to compare a counter deck">
          {[
            { step: '01', title: 'Choose a target', detail: 'Enter the full eight-card deck.', tone: 'text-violet-200' },
            { step: '02', title: 'Compare candidates', detail: 'Search a bounded set of complete decks.', tone: 'text-orange-200' },
            { step: '03', title: 'Review the fit', detail: 'Consider your cards, levels, and play style.', tone: 'text-violet-200' },
          ].map(({ step, title, detail, tone }) => <div key={step} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-slate-950/55 p-4 sm:p-5">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-sm font-black ${tone}`}>{step}</span>
            <div><h2 className="font-bold text-white">{title}</h2><p className="mt-1 text-sm leading-5 text-slate-400">{detail}</p></div>
          </div>)}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Model estimate reminders">
          <div className="flex items-center gap-3 rounded-2xl border border-violet-300/15 bg-violet-400/[0.06] p-4"><span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-300/10 text-violet-200">≈</span><p className="text-sm leading-5 text-slate-300"><strong className="text-white">Model estimate.</strong> Candidate scores are not observed win rates.</p></div>
          <div className="flex items-center gap-3 rounded-2xl border border-orange-300/15 bg-orange-400/[0.05] p-4"><span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-300/10 text-orange-200">↗</span><p className="text-sm leading-5 text-slate-300"><strong className="text-white">Use your judgment.</strong> Search is limited; player decisions and balance matter.</p></div>
        </section>

        <section className="mt-8 space-y-3" aria-label="More about counter decks">
          <details className="group rounded-2xl border border-white/10 bg-white/[0.03] px-4 sm:px-5">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 [&::-webkit-details-marker]:hidden">How to judge a counter deck<span aria-hidden="true" className="text-xl text-violet-200 transition-transform group-open:rotate-45">+</span></summary>
            <div className="max-w-4xl space-y-3 pb-5 text-sm leading-6 text-slate-300">
              <p>A counter is a complete plan for handling the opponent’s threats. Check the win condition, support, defense, and spell coverage together. Then ask whether you can return to key defensive cards through the cycle and turn a defense into pressure.</p>
              <p>Card levels, familiarity, tower troops, starting hand, placements, timing, and balance changes can all affect play. Use candidates as ideas to test, not as guaranteed counters or global rankings.</p>
              <p>Rival Royale estimates decisive matchups from supported deck inputs. Search ranks a limited candidate set and does not test every legal deck. See the <Link className={linkClass} href="/models">model methodology</Link> for assumptions and known limits.</p>
            </div>
          </details>
          <details className="group rounded-2xl border border-white/10 bg-white/[0.03] px-4 sm:px-5">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 [&::-webkit-details-marker]:hidden">Clash Royale counter deck FAQs<span aria-hidden="true" className="text-xl text-violet-200 transition-transform group-open:rotate-45">+</span></summary>
            <div className="divide-y divide-white/10 pb-1">
              {faqs.map(({ question, answer }) => <div key={question} className="py-4"><h2 className="font-bold text-white">{question}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{answer}</p></div>)}
            </div>
          </details>
        </section>
      </article>
    </main>
  );
}
