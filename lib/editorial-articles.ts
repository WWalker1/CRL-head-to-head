import october from '@/content/editorial/approved/october-2026-balance-changes.json';
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

const approved: Record<string, unknown> = { [october.slug]: october };
export const approvedSlugs = Object.keys(approved);
export async function loadEditorialArticle(slug: string): Promise<EditorialArticle | null> {
  const article = approved[slug];
  return isEditorialArticle(article,slug) ? article : null;
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
