import Link from 'next/link';
import type { ReactNode } from 'react';

export default function ArticlePage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return <main className="min-h-[calc(100vh-73px)] bg-gradient-to-b from-violet-50 via-white to-orange-50 px-4 py-10 text-slate-900 sm:px-6 sm:py-14">
    <article className="mx-auto max-w-3xl rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-10">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-700 underline underline-offset-4">← Rival Royale</Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-5 text-lg leading-8 text-slate-600">{intro}</p>
      <div className="mt-8 space-y-7 text-base leading-7 text-slate-700 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-950 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_p+p]:mt-3 [&_a]:font-semibold [&_a]:text-violet-700 [&_a]:underline [&_a]:underline-offset-4 [&_li]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">{children}</div>
    </article>
  </main>;
}
