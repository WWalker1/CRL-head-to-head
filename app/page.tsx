import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Clash Royale Wins Against Friends',
  description: 'Track recorded Clash Royale wins and losses against friends. Add player tags, see head-to-head records, and explore deck counters.',
  alternates: { canonical: '/' },
  openGraph: { title: 'Track Clash Royale Wins Against Friends | Rival Royale', description: 'Add friends by player tag and see your recorded Clash Royale head-to-head results.' },
};

const steps = [
  { image: '/images/find-tag-step1.png', title: 'Open your profile', description: 'Tap your player name at the top of the Clash Royale home screen.' },
  { image: '/images/find-tag-step2.png', title: 'Find your tag', description: 'Your player tag appears below your name on your profile.' },
  { image: '/images/find-tag-step3.png', title: 'Copy your tag', description: 'Tap Copy Tag, then paste it when you create your account.' },
];
const faqs = [
  { question: 'How can I track Clash Royale wins against friends?', answer: 'Create an account with your Clash Royale player tag, add a friend’s tag, and sync eligible recent 1v1 battles available from the game API. Rival Royale summarizes recorded head-to-head results; available history may be limited.' },
  { question: 'Is battle tracking automatic?', answer: 'When tracking is enabled, recent eligible battles can be synced from the game API and refreshed from the dashboard. The API may omit older battles, so the tracker cannot promise a complete lifetime record.' },
  { question: 'What types of battles are tracked?', answer: 'The head-to-head tracker focuses on eligible 1v1 battles. Team battles and unsupported modes are excluded.' },
  { question: 'Are deck matchup estimates guaranteed results?', answer: 'No. Estimates are produced by a model for supported complete decks. They are not guarantees or a player’s personal win rate. In-game decisions, balance changes, and model coverage affect how useful they are.' },
  { question: 'How do I know if I’m good at Clash Royale?', answer: 'A win rate is one clue, but it depends on who you face and which decks you use. Rival Royale’s optional matchup skill view compares recorded results with supported deck estimates and highlights tough wins and favored losses. It is a model-relative snapshot, not a complete measure of skill.' },
  { question: 'Am I better than my friend at Clash Royale?', answer: 'Compare your recorded head-to-head wins and losses, then look at the decks each of you plays. If matchup skill is enabled, you can also compare each player’s model-relative performance. Available battle history may be incomplete, so the record is only as complete as the matches the game API provides.' },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');
  const faqStructuredData = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(({ question, answer }) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) };
  return <main className="min-h-[calc(100vh-73px)] bg-gradient-to-b from-[#f2edff] via-[#fff9f2] to-white text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }} />
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pt-16">
      <section aria-labelledby="home-heading" className="grid items-center gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-700">Rival Royale</p>
          <h1 id="home-heading" className="mt-3 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">Track your Clash Royale wins against friends</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700">Add your friends by player tag and see your recorded wins, losses, and head-to-head history in one place.</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-700 px-6 font-bold text-white shadow-lg shadow-violet-700/20 transition hover:bg-violet-800">Start tracking friends</Link>
            <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-violet-300 bg-white px-5 font-semibold text-violet-800 transition hover:border-violet-500">Sign in</Link>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">Tracks eligible 1v1 battles available from the game API. Older matches may be unavailable.</p>
        </div>
        <figure className="overflow-hidden rounded-2xl border border-violet-200 bg-white p-3 shadow-xl shadow-violet-900/10 sm:p-4">
          <div className="aspect-[4/3] overflow-hidden rounded-lg sm:aspect-auto">
            <Image src="/images/dashboard-screenshot.png" alt="Rival Royale dashboard showing recorded Clash Royale wins and losses against friends" width={1888} height={520} priority sizes="(max-width: 640px) 1100px, (max-width: 1024px) 100vw, 55vw" className="h-full w-auto max-w-none sm:h-auto sm:w-full sm:max-w-full" />
          </div>
          <figcaption className="pt-3 text-sm font-semibold text-slate-700">Your friend records at a glance</figcaption>
        </figure>
      </section>
      <section className="mt-14 rounded-3xl border border-violet-100 bg-white p-5 shadow-lg shadow-violet-900/5 sm:p-8" aria-labelledby="tag-heading">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-orange-700">Get started</p>
        <h2 id="tag-heading" className="mt-2 text-3xl font-black tracking-tight text-slate-950">Find your player tag in three steps</h2>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">You’ll use your tag when you sign up, then add a friend’s tag to track your battles together.</p>
        <div className="mt-7 grid gap-8 lg:grid-cols-3 lg:gap-5">{steps.map((step, index) => <div key={step.image} className="min-w-0">
          <div className="overflow-hidden rounded-xl border border-violet-100 bg-[#f4f0fb]"><Image src={step.image} alt={`Step ${index + 1}: ${step.title} in Clash Royale`} width={688} height={566} sizes="(max-width: 1024px) 100vw, 33vw" className="h-auto w-full" /></div>
          <h3 className="mt-4 text-xl font-bold text-slate-900"><span className="mr-2 text-violet-700">{index + 1}.</span>{step.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
        </div>)}</div>
        <p className="mt-8 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-950">A player tag starts with <strong>#</strong>. Copy it directly from the game so every character is correct.</p>
      </section>
      <section className="mt-14" aria-labelledby="tools-heading">
        <h2 id="tools-heading" className="text-2xl font-black tracking-tight">Explore your decks</h2>
        <p className="mt-2 max-w-2xl text-slate-600">Compare complete decks and explore possible counters for your next matchup.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Link href="/counter-deck" className="rounded-2xl border border-orange-200 bg-orange-50 p-5 transition hover:border-orange-400 hover:shadow-md"><strong className="block text-lg text-slate-950">Find a counter deck →</strong><span className="mt-1 block text-sm leading-6 text-slate-700">Choose a target deck and see ranked candidate decks you can export.</span></Link>
          <Link href="/matchup" className="rounded-2xl border border-violet-200 bg-violet-50 p-5 transition hover:border-violet-400 hover:shadow-md"><strong className="block text-lg text-slate-950">Compare two decks →</strong><span className="mt-1 block text-sm leading-6 text-slate-700">See a model estimate for a complete deck matchup.</span></Link>
        </div>
      </section>
      <section className="mt-14" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-2xl font-black tracking-tight">Frequently asked questions</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">{faqs.map(({ question, answer }) => <article key={question} className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-950">{question}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p></article>)}</div>
        <p className="mt-5 text-sm text-slate-600">Learn more about <Link href="/models" className="font-semibold text-violet-700 underline underline-offset-2">model methodology and limitations</Link>.</p>
      </section>
      <p className="mt-12 text-center text-xs text-slate-500">Rival Royale is an independent Clash Royale companion.</p>
    </div>
  </main>;
}
