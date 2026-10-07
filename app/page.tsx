import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import Image from 'next/image';
import AnimatedSection from '@/components/AnimatedSection';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Rival Royale: Clash Royale Matchups, Counters & Friend Stats",
  description: "Compare Clash Royale decks, explore model-ranked counter candidates, and track recorded results against friends. See matchup estimates with their limitations clearly explained.",
  alternates: { canonical: '/' },
  openGraph: {
    title: "Rival Royale: Clash Royale Matchups, Counters & Friend Stats",
    description: "Compare decks, explore supported counter candidates, and track head-to-head results with friends in Clash Royale.",
  },
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How can I track Clash Royale wins against friends?",
        "acceptedAnswer": {
          "@type": "Answer",
        "text": "Create an account with your Clash Royale player tag, add a friend's tag, and sync the eligible recent 1v1 battles available from the game API. Rival Royale summarizes the recorded head-to-head results; available history may be limited."
        }
      },
      {
        "@type": "Question",
        "name": "Is the battle tracking automatic?",
        "acceptedAnswer": {
          "@type": "Answer",
        "text": "When tracking is enabled, recent eligible battles can be synced from the game API and refreshed from the dashboard. The API may omit older battles, so the tracker cannot promise a complete lifetime record."
        }
      },
      {
        "@type": "Question",
        "name": "What types of battles are tracked?",
        "acceptedAnswer": {
          "@type": "Answer",
        "text": "The head-to-head tracker focuses on eligible 1v1 battles. Team battles and unsupported modes are excluded from that record."
        }
      },
      {
        "@type": "Question",
        "name": "Are Clash Royale deck matchup estimates guaranteed results?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. Estimates are produced by a model for supported complete decks. They are not guarantees or a player's personal win rate, and in-game decisions, balance changes, and model coverage affect how useful they are."
        }
      }
    ]
  };

  return (
    <main className="relative min-h-[calc(100vh-73px)] overflow-hidden bg-[#0d1024] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }} />
      <div aria-hidden="true" className="pointer-events-none absolute -right-36 -top-28 h-[30rem] w-[30rem] rounded-full bg-violet-600/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-orange-500/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pb-16 lg:pt-16">
        <section className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12" aria-labelledby="home-heading">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-violet-300/25 bg-violet-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-violet-200">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-orange-400" /> Clash Royale deck tools
            </p>
            <h1 id="home-heading" className="mt-5 max-w-2xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Make your next matchup make sense.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Compare complete decks, explore counter candidates, and track your results against friends.
            </p>
            <p className="mt-4 text-sm text-slate-400">
              Already have an account? <Link href="/login" className="font-semibold text-orange-200 underline decoration-orange-300/60 underline-offset-4 hover:text-white">Sign in</Link>
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-2xl">
            <div aria-hidden="true" className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-violet-500/30 via-blue-500/10 to-orange-500/30 blur-xl" />
            <figure className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-blue-900 to-violet-950 p-2 shadow-2xl shadow-black/30 sm:rounded-3xl sm:p-3">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-950/30 sm:rounded-2xl">
                <Image
                  src="/images/dashboard-screenshot.png"
                  alt="Rival Royale friend dashboard showing recorded Clash Royale wins, losses, and win rates"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-cover object-left"
                />
              </div>
              <figcaption className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1 pt-3 text-xs text-blue-100 sm:px-3 sm:text-sm">
                <span className="font-semibold">Friend matchups at a glance</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1">Recorded results</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <nav aria-label="Explore Rival Royale" className="mt-8 grid gap-3 sm:grid-cols-3 lg:mt-10">
          <Link href="/counter-deck" className="group flex min-h-24 items-center gap-4 rounded-2xl border border-orange-300/25 bg-gradient-to-br from-orange-500/15 to-orange-900/10 p-4 transition hover:-translate-y-0.5 hover:border-orange-200/60 hover:bg-orange-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200 sm:p-5">
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-400/15 text-orange-200">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><path d="M4 5.5 9 4l5 1.5L20 4v14.5L14 20l-5-1.5L4 20V5.5Z" /><path d="M9 4v14.5M14 5.5V20" /><path d="m15.5 9 1.2 1.2 2.3-2.4" /></svg>
            </span>
            <span className="min-w-0 flex-1"><strong className="block text-base font-bold text-white sm:text-lg">Counter finder</strong><span className="mt-1 block text-sm text-slate-300">Explore candidate decks</span></span>
            <span aria-hidden="true" className="text-xl text-orange-200 transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link href="/matchup" className="group flex min-h-24 items-center gap-4 rounded-2xl border border-violet-300/25 bg-gradient-to-br from-violet-500/15 to-violet-900/10 p-4 transition hover:-translate-y-0.5 hover:border-violet-200/60 hover:bg-violet-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200 sm:p-5">
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><path d="M4 6.5h6v11H4zM14 6.5h6v11h-6z" /><path d="M10 12h4M11.5 10.5 10 12l1.5 1.5M12.5 10.5 14 12l-1.5 1.5" /></svg>
            </span>
            <span className="min-w-0 flex-1"><strong className="block text-base font-bold text-white sm:text-lg">Deck matchup</strong><span className="mt-1 block text-sm text-slate-300">Compare two full decks</span></span>
            <span aria-hidden="true" className="text-xl text-violet-200 transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link href="/signup" className="group flex min-h-24 items-center gap-4 rounded-2xl border border-orange-300/25 bg-gradient-to-br from-violet-500/10 to-orange-500/10 p-4 transition hover:-translate-y-0.5 hover:border-orange-200/60 hover:bg-violet-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200 sm:p-5">
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-400/15 text-orange-200">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 5-6" /><path d="M16 7h3v3" /></svg>
            </span>
            <span className="min-w-0 flex-1"><strong className="block text-base font-bold text-white sm:text-lg">Your stats</strong><span className="mt-1 block text-sm text-slate-300">Track results with friends</span></span>
            <span aria-hidden="true" className="text-xl text-orange-200 transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </nav>

        <section className="mx-auto mt-10 max-w-4xl space-y-3 lg:mt-12" aria-label="More information">
          <details className="group rounded-2xl border border-white/10 bg-white/[0.04] px-4 sm:px-5">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-white marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 [&::-webkit-details-marker]:hidden">
              How matchup estimates and battle history work
              <span aria-hidden="true" className="text-xl text-violet-200 transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="max-w-3xl space-y-3 pb-5 text-sm leading-6 text-slate-300">
              <p>Matchup estimates compare supported complete decks with a trained model. Counter search checks a bounded candidate set, so suggestions are not guaranteed counters, live rankings, or observed win rates.</p>
              <p>Friend stats summarize eligible 1v1 battles available through the game API. The API may omit older matches, so recorded results may not cover every game you have played.</p>
              <p><Link href="/models" className="font-semibold text-violet-200 underline underline-offset-4 hover:text-white">Read the model methodology</Link> for assumptions and limitations.</p>
            </div>
          </details>
          <details className="group rounded-2xl border border-white/10 bg-white/[0.04] px-4 sm:px-5">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-white marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 [&::-webkit-details-marker]:hidden">
              Frequently asked questions
              <span aria-hidden="true" className="text-xl text-violet-200 transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="pb-2"><FAQSection /></div>
          </details>
          <details className="group rounded-2xl border border-white/10 bg-white/[0.04] px-4 sm:px-5">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-white marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 [&::-webkit-details-marker]:hidden">
              How to find your Clash Royale player tag
              <span aria-hidden="true" className="text-xl text-violet-200 transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="pb-2"><MobileTutorialSection /></div>
          </details>
        </section>

        <p className="mt-8 text-center text-xs text-slate-500">Rival Royale is an independent Clash Royale companion. Model estimates are guidance, not guarantees.</p>
      </div>
    </main>
  );
}

// FAQ Section component
function FAQSection() {
  return (
    <AnimatedSection delay={1000}>
      <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl p-6 md:p-8 mb-8 md:mb-16 max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
              How can I track Clash Royale wins against friends?
            </h3>
            <p className="text-gray-600 text-sm md:text-base">
              Create an account with your player tag, add a friend's tag, and sync the recent eligible 1v1 battles available through the game API. Rival Royale summarizes the recorded results; history availability can vary.
            </p>
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
              Is the battle tracking automatic?
            </h3>
            <p className="text-gray-600 text-sm md:text-base">
              When history sync is enabled, eligible recent battles can be refreshed from the dashboard. The game API may omit older battles, so a tracker record may not cover every match you have played.
            </p>
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
              What battle types are tracked?
            </h3>
            <p className="text-gray-600 text-sm md:text-base">
              The head-to-head record focuses on eligible 1v1 battles. Team battles and unsupported modes are excluded.
            </p>
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
              Are the matchup estimates guaranteed results?
            </h3>
            <p className="text-gray-600 text-sm md:text-base">
              No. Estimates apply to the model and its supported complete-deck inputs. They are not guarantees or a personal win rate; player decisions, current balance, and model coverage can affect how closely an estimate matches a real battle. Read the <Link href="/models" className="text-blue-700 underline">methodology</Link> for more detail.
            </p>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}

// Mobile-friendly tutorial section component
function MobileTutorialSection() {
  return (
    <AnimatedSection delay={600}>
      <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl p-4 md:p-8 mb-6 md:mb-12 max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 text-center">
          How to Find Your Player Tag
        </h2>
        <p className="text-sm md:text-base text-gray-600 text-center mb-4 md:mb-8">
          You'll need your Clash Royale player tag to get started. Here's how to find it:
        </p>
        
        {/* Desktop: Show all 3 steps */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 mb-8">
          <TutorialStep 
            stepNumber={1}
            imageSrc="/images/find-tag-step1.png"
            title="Select player name"
            description="Tap on your player name at the top of the game screen"
          />
          <TutorialStep 
            stepNumber={2}
            imageSrc="/images/find-tag-step2.png"
            title="Select player tag"
            description="Your player tag will be displayed below your name (e.g., #COG20PR2)"
          />
          <TutorialStep 
            stepNumber={3}
            imageSrc="/images/find-tag-step3.png"
            title="Copy Tag"
            description="Tap the &quot;Copy Tag&quot; button to copy your player tag to your clipboard"
          />
        </div>

        {/* Mobile: Show only first step with link to expand */}
        <div className="md:hidden space-y-4 mb-4">
          <TutorialStep 
            stepNumber={1}
            imageSrc="/images/find-tag-step1.png"
            title="Select player name"
            description="Tap on your player name at the top of the game screen"
          />
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Need help? Open the full tutorial here.
            </p>
            <p className="text-xs text-gray-500">
              Steps 2 & 3: Find your tag below your name and tap &quot;Copy Tag&quot;
            </p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-3 md:p-4 text-center border-2 border-blue-100">
          <p className="text-xs md:text-sm text-gray-700 mb-2">
            <span className="font-semibold">Example Player Tag:</span>
          </p>
          <code className="text-base md:text-lg font-mono font-semibold text-blue-600 bg-white px-3 md:px-4 py-1 md:py-2 rounded border border-blue-200">
            #COG20PR2
          </code>
        </div>
      </div>
    </AnimatedSection>
  );
}

// Tutorial step component
function TutorialStep({ 
  stepNumber, 
  imageSrc, 
  title, 
  description 
}: { 
  stepNumber: number; 
  imageSrc: string; 
  title: string; 
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mb-4 relative w-full aspect-[688/560] bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300 shadow-md hover:shadow-lg transition-shadow">
        <Image 
          src={imageSrc} 
          alt={`Step ${stepNumber}: ${title}`}
          fill
          className="object-cover"
        />
      </div>
      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
        {stepNumber}. {title}
      </h3>
      <p className="text-xs md:text-sm text-gray-600">
        {description}
      </p>
    </div>
  );
}
