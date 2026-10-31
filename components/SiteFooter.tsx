import Link from 'next/link';

export default function SiteFooter() {
  return <footer className="border-t border-slate-200 bg-white px-4 py-8 text-sm text-slate-600">
    <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p>Rival Royale is an independent Clash Royale companion.</p>
      <nav aria-label="Site information" className="flex flex-wrap gap-x-5 gap-y-2">
        <Link href="/guides" className="inline-flex min-h-11 items-center underline underline-offset-4">Guides</Link>
        <Link href="/about" className="inline-flex min-h-11 items-center underline underline-offset-4">About &amp; feedback</Link>
        <Link href="/privacy" className="inline-flex min-h-11 items-center underline underline-offset-4">Privacy</Link>
      </nav>
    </div>
  </footer>;
}
