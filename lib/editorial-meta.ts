export type MetaCard = { id: number; name: string; icon: string; evolution: boolean };
export type MetaDeck = { id: string; cards: MetaCard[]; games: number; wins: number; winRate: number; usageRate: number };
export type MetaReport = {
  schemaVersion: 1; kind: 'top-ranked-decks'; publishedAt: string;
  windowStart: string; windowEnd: string; cohort: string;
  sampledPlayerDeckAppearances: number; minGames: number;
  methodology: string; decks: MetaDeck[]; sampledPlayers?: number; playerLogsFailed?: number;
};

// Public-read-only R2 domain. Never expose S3 access keys to the browser.
// When unset, the feature displays an unpublished state rather than fake metrics.
export async function loadMetaReport(): Promise<MetaReport | null> {
  const base = process.env.R2_EDITORIAL_PUBLIC_BASE_URL;
  if (!base || !/^https:\/\//.test(base)) return null;
  try {
    const response = await fetch(base.replace(/\/$/, '') + '/editorial/meta/latest.json', {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const value: unknown = await response.json();
    if (!isMetaReport(value)) return null;
    return value;
  } catch {
    return null;
  }
}

export function isMetaReport(value: unknown): value is MetaReport {
  if (!value || typeof value !== 'object') return false;
  const r = value as Partial<MetaReport>;
  if (r.schemaVersion !== 1 || r.kind !== 'top-ranked-decks'
      || typeof r.methodology !== 'string'
      || typeof r.sampledPlayerDeckAppearances !== 'number'
      || typeof r.cohort !== 'string'
      || typeof r.windowStart !== 'string' || typeof r.windowEnd !== 'string'
      || typeof r.publishedAt !== 'string' || !Array.isArray(r.decks)) return false;
  return r.decks.every(d => !!d && typeof d.id === 'string'
    && typeof d.games === 'number' && d.games >= 0
    && typeof d.wins === 'number' && d.wins >= 0 && d.wins <= d.games
    && typeof d.winRate === 'number' && d.winRate >= 0 && d.winRate <= 100
    && Array.isArray(d.cards) && d.cards.length === 8
    && d.cards.every(c => Number.isInteger(c.id) && typeof c.name === 'string' && typeof c.icon === 'string'));
}
