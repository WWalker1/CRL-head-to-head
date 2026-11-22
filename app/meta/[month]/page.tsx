import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RankedReport } from '@/components/RankedReport';
import { loadMetaReport, monthKey, archiveMonths } from '@/lib/editorial-meta';
type Props = {params:Promise<{month:string}>};
async function details({params}: Props) {
  const {month} = await params;
  const key = monthKey(month);
  if (!key) notFound();
  const report = await loadMetaReport(key);
  if (!report) notFound();
  const title = 'Best Clash Royale Decks — '+new Date(key+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});
  return {month,title,report};
}
export const revalidate = 3600;
export async function generateMetadata(props: Props): Promise<Metadata> {
  const {month,title,report} = await details(props);
  return {title,description:'Ranked deck usage and observed wins across '+report.daysObserved.length+' sampled dates in '+month.replace('-',' ')+'.',alternates:{canonical:'/meta/'+month},robots:{index:process.env.VERCEL_ENV !== 'preview'}};
}
export default async function MonthlyPage(props:Props) {
  const {title,report} = await details(props);
  return <RankedReport month title={title} report={report} months={await archiveMonths()}/>;
}
