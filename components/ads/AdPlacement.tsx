import { getAdSenseConfig, type AdPlacement as Placement } from '@/lib/adsense';
import AdSenseUnit from './AdSenseUnit';

export default function AdPlacement({ placement, dark = false }: {
  placement: Placement;
  dark?: boolean;
}) {
  const config = getAdSenseConfig();
  const slot = config.slots[placement]?.trim();
  if (!config.enabled || !slot || !/^\d+$/.test(slot)) return null;

  return <aside aria-label="Advertisement" className={`my-10 w-full min-w-0 rounded-xl border px-3 py-4 ${dark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
    <p className="mb-3 text-center text-[10px] uppercase tracking-widest">Advertisement</p>
    <AdSenseUnit publisherId={config.publisherId} slot={slot} />
  </aside>;
}
