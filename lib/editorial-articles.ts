/** Structured editorial article template: AI generates JSON, never arbitrary JSX or HTML. */
export type EditorialSection = {
  heading: string;
  paragraphs: string[];
};
export type EditorialArticle = {
  schemaVersion: 1;
  slug: string;
  kind: 'balance-changes' | 'monthly-meta' | 'strategy';
  title: string;
  description: string;
  author: string;
  publishedAt: string;
  updatedAt: string;
  sources: { label: string; url: string }[];
  sections: EditorialSection[];
};

export async function loadEditorialArticle(slug: string): Promise<EditorialArticle | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const base = process.env.R2_EDITORIAL_PUBLIC_BASE_URL;
  if (!base || !base.startsWith('https://')) return null;
  try {
    const response = await fetch(base.replace(/\/$/, '') + '/editorial/articles/' + slug + '.json', {
      next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const article: unknown = await response.json();
    if (!isEditorialArticle(article, slug)) return null;
    return article;
  } catch { return null; }
}

export function isEditorialArticle(value: unknown, slug?: string): value is EditorialArticle {
  if (!value || typeof value !== 'object') return false;
  const a = value as Partial<EditorialArticle>;
  return a.schemaVersion === 1 && typeof a.slug === 'string' && (!slug || a.slug === slug)
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug)
    && ['balance-changes', 'monthly-meta', 'strategy'].includes(a.kind || '')
    && typeof a.title === 'string' && a.title.length >= 12 && a.title.length <= 100
    && typeof a.description === 'string' && a.description.length >= 40 && a.description.length <= 240
    && typeof a.author === 'string' && a.author.length > 0
    && typeof a.publishedAt === 'string' && !isNaN(Date.parse(a.publishedAt))
    && typeof a.updatedAt === 'string' && !isNaN(Date.parse(a.updatedAt))
    && Array.isArray(a.sources) && a.sources.length > 0
    && a.sources.every(s => s && typeof s.label === 'string' && /^https:\/\//.test(s.url))
    && Array.isArray(a.sections) && a.sections.length >= 2
    && a.sections.every(s => s && typeof s.heading === 'string'
      && Array.isArray(s.paragraphs) && s.paragraphs.length > 0
      && s.paragraphs.every(p => typeof p === 'string' && p.length > 0));
}
