import { readReport } from './editorial-store';
export type MetaCard = { id: number; name: string; icon: string; form: string; evolution: boolean };
export type MetaDeck = { id: string; averageElixir: number | null; cards: MetaCard[]; games: number; wins: number; winRate: number; usageRate: number };
export type MetaReport = {
  schemaVersion: 1; kind: 'top-ranked-decks'; publishedAt: string;
  windowStart: string; windowEnd: string; cohort: string;
  sampledPlayerDeckAppearances: number; minGames: number;
  physicalMatches: number; daysObserved: string[]; collectionWindows?: number;
  methodology: string; decks: MetaDeck[]; sampledPlayers?: number; playerLogsFailed?: number;
};

export async function loadMetaReport(month?: string): Promise<MetaReport | null> {
  const value = await readReport(month ? 'months/'+month+'.json' : 'latest.json');
  if (value == null) return null;
  if (!isMetaReport(value)) throw new Error('Invalid editorial snapshot');
  return value;
}

const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const date = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
export function isMetaReport(value: unknown): value is MetaReport {
  if (!value || typeof value !== 'object') return false;
  const r = value as Partial<MetaReport>;
  if (r.schemaVersion !== 1 || r.kind !== 'top-ranked-decks' || typeof r.cohort !== 'string'
    || typeof r.methodology !== 'string' || !date(r.publishedAt) || !date(r.windowStart) || !date(r.windowEnd)
    || Date.parse(r.windowStart) >= Date.parse(r.windowEnd) || !count(r.minGames) || r.minGames < 1
    || !count(r.physicalMatches) || !count(r.sampledPlayerDeckAppearances) || !r.sampledPlayerDeckAppearances
    || r.physicalMatches > r.sampledPlayerDeckAppearances || !Array.isArray(r.daysObserved)
    || !r.daysObserved.every(d => /^\d{8}$/.test(d)) || !Array.isArray(r.decks) || r.decks.length > 50) return false;
  const total = r.sampledPlayerDeckAppearances;
  return r.decks.every(d => d && typeof d.id === 'string' && count(d.games) && d.games >= r.minGames!
    && count(d.wins) && d.wins <= d.games && d.games <= total
    && Number.isFinite(d.winRate) && Math.abs(d.winRate - 100*d.wins/d.games) <= 0.051
    && Number.isFinite(d.usageRate) && Math.abs(d.usageRate - 100*d.games/total) <= 0.0051
    && (d.averageElixir === null || (Number.isFinite(d.averageElixir) && d.averageElixir >= 0 && d.averageElixir <= 10))
    && Array.isArray(d.cards) && d.cards.length === 8
    && d.cards.every(c => c && count(c.id) && typeof c.name === 'string' && typeof c.icon === 'string'
      && (!c.icon || c.icon.startsWith('https://api-assets.clashroyale.com/')) && ['Hero','Evolution','Base'].includes(c.form))
    && new Set(d.cards.map(c => c.id)).size === 8);
}

const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
export function monthSlug(key: string) {
  return months[Number(key.slice(5,7))-1]+'-'+key.slice(0,4);
}
export function monthKey(slug: string) {
  const [name,year,extra] = slug.split('-');
  const n = months.indexOf(name)+1;
  return n && /^\d{4}$/.test(year) && extra === undefined ? year+'-'+String(n).padStart(2,'0') : null;
}
export async function archiveMonths(): Promise<string[]> {
  const index = await readReport('index.json');
  if (!Array.isArray(index)) return [];
  return index.filter((m): m is string => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m));
}
