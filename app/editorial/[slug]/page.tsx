import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadEditorialArticle } from '@/lib/editorial-articles';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await loadEditorialArticle(slug);
  if (!article) return { title: 'Article unavailable', robots: { index: false, follow: false } };
  return {
    title: article.title,
    robots: { index: process.env.VERCEL_ENV !== 'preview' },
    description: article.description,
    alternates: { canonical: '/editorial/' + slug },
    openGraph: { title: article.title, description: article.description, type: 'article',
      publishedTime: article.publishedAt, modifiedTime: article.updatedAt },
  };
}

export default async function EditorialArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await loadEditorialArticle(slug);
  if (!article) notFound();
  return <main className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-orange-50 px-4 py-10 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100 sm:px-6 sm:py-14">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@type':'Article',headline:article.title,datePublished:article.publishedAt,dateModified:article.updatedAt,author:{'@type':'Organization',name:article.author},citation:article.sources.map(s=>s.url)}).replace(/</g,'\\u003c')}}/>
    <article className="mx-auto max-w-3xl rounded-2xl border border-violet-100 bg-white p-5 shadow-sm dark:border-violet-900 dark:bg-slate-900 sm:p-10">
      <Link href="/guides" className="inline-flex min-h-11 items-center font-semibold text-violet-700 underline underline-offset-4 dark:text-violet-300">← Strategy guides</Link>
      <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-violet-700 dark:text-violet-300">{article.kind.replace('-', ' ')}</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{article.title}</h1>
      <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">{article.description}</p>
      <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">By {article.author} · Updated <time dateTime={article.updatedAt}>{new Date(article.updatedAt).toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' })}</time></p>
      <div className="mt-9 space-y-8">{article.sections.map((section, index) => <section key={index}>
        <h2 className="text-2xl font-bold">{section.heading}</h2>
        {section.paragraphs.map((paragraph, n) => <p key={n} className="mt-3 text-base leading-8 text-slate-700 dark:text-slate-300">{paragraph}</p>)}
      </section>)}</div>
      <section className="mt-12 border-t border-slate-200 pt-6 dark:border-slate-700">
        <h2 className="text-xl font-bold">Sources and verification</h2>
        <ul className="mt-3 list-inside list-disc space-y-2">{article.sources.map(source => <li key={source.url}>
          <a className="break-words font-semibold text-violet-700 underline dark:text-violet-300" href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a>
        </li>)}</ul>
        <p className="mt-5 text-sm text-slate-500 dark:text-slate-400"><Link className="underline" href="/meta">See the current Ranked deck sample</Link>. Changes to game balance or match conditions may make older advice outdated.</p>
      </section>
    </article>
  </main>;
}
