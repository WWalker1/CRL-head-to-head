import Link from 'next/link';

export default function Footer() {
  return <footer className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-8 text-slate-600 dark:text-slate-300 sm:px-6">
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Guides and site information" className="flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold text-violet-800 dark:text-violet-200">
        <Link className="inline-flex min-h-11 items-center hover:underline" href="/clash-royale-counter-deck-finder">Deck building guide</Link>
        <Link className="inline-flex min-h-11 items-center hover:underline" href="/guides/understand-skill-score">Understand your skill score</Link>
        <Link className="inline-flex min-h-11 items-center hover:underline" href="/models">Model methodology</Link>
        <Link className="inline-flex min-h-11 items-center hover:underline" href="/about">About</Link>
        <Link className="inline-flex min-h-11 items-center hover:underline" href="/contact">Contact</Link>
        <Link className="inline-flex min-h-11 items-center hover:underline" href="/privacy">Privacy</Link>
      </nav>
      <p className="mt-4 max-w-3xl text-xs leading-6">This material is unofficial and is not endorsed by Supercell. For more information, see <a className="underline underline-offset-2" href="https://supercell.com/en/fan-content-policy/">Supercell’s Fan Content Policy</a>. Clash Royale and its game assets belong to Supercell.</p>
    </div>
  </footer>;
}
