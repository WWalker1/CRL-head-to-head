import type { Metadata } from 'next';
import { RankedReport } from '@/components/RankedReport';
import { loadMetaReport, archiveMonths } from '@/lib/editorial-meta';
export const revalidate = 3600;
export async function generateMetadata(): Promise<Metadata> {
  const report = await loadMetaReport();
  return {title:'Best Clash Royale Ranked Decks | Weekly Meta Report',description:'See which eight-card decks top Ranked players use, with observed games, win rates, elixir and sample coverage.',alternates:{canonical:'/meta'},robots:{index:!!report && process.env.VERCEL_ENV !== 'preview'}};
}
export default async function MetaPage() {
  const [report,months] = await Promise.all([loadMetaReport(),archiveMonths()]);
  return <RankedReport title="Best Clash Royale Ranked Decks" report={report} months={months}/>;
}
