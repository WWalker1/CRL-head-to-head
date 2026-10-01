'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CatalogVariant } from './types';

type Filter = 'all' | 'base' | 'evolution' | 'hero';

export default function CardPicker({ open, title, variants, selectedKeys, replacingKey, onSelect, onRemove, onClose }: {
  open: boolean;
  title: string;
  variants: CatalogVariant[];
  selectedKeys: string[];
  replacingKey?: string;
  onSelect: (key: string) => void;
  onRemove?: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const searchRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    setQuery(''); setFilter('all');
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', handleKey);
    const focus = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => { window.removeEventListener('keydown', handleKey); window.clearTimeout(focus); document.body.style.overflow = previousOverflow; previouslyFocused?.focus(); };
  }, [open]);
  const usedBases = useMemo(() => new Set(selectedKeys.filter(key => key !== replacingKey).map(key => key.split(':')[0])), [selectedKeys, replacingKey]);
  const visible = useMemo(() => variants.filter(card => {
    const name = `${card.name} ${card.base_name ?? ''}`.toLowerCase();
    return name.includes(query.trim().toLowerCase()) && (filter === 'all' || (filter === 'base' ? card.form === 0 : filter === 'evolution' ? card.form === 1 : card.form === 2));
  }).sort((a, b) => a.name.localeCompare(b.name)), [variants, query, filter]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/75 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-blue-300/20 bg-[#101d35] text-white shadow-2xl sm:max-h-[85dvh] sm:rounded-3xl">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-300">Card library</p><h2 className="mt-1 text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-blue-100/70">Choose the card and form you want to play.</p></div><button type="button" onClick={onClose} aria-label="Close card library" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 text-xl text-white hover:bg-white/10">×</button></div>
      <div className="space-y-3 px-4 py-3 sm:px-5"><label className="block text-sm font-semibold text-blue-100">Search cards<input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Hog Rider, Fireball, Evo…" className="mt-2 h-12 w-full rounded-xl border border-blue-300/30 bg-slate-950/70 px-4 text-base text-white outline-none placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30" /></label><div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Card form filter">{([['all', 'All'], ['base', 'Base'], ['evolution', 'Evolution'], ['hero', 'Hero']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${filter === value ? 'bg-orange-500 text-white' : 'border border-white/15 bg-white/5 text-blue-100 hover:bg-white/10'}`}>{label}</button>)}</div></div>
      <div className="overflow-y-auto overscroll-contain px-4 pb-5 sm:px-5"><div className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4 sm:grid-cols-6">{visible.map(card => { const used = usedBases.has(String(card.card_id ?? card.key.split(':')[0])); return <button type="button" key={card.key} disabled={used} onClick={() => { onSelect(card.key); onClose(); }} aria-label={`Select ${card.name}`} className="min-h-36 overflow-hidden rounded-xl border border-blue-200/15 bg-slate-900/80 text-left transition hover:border-orange-400 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-35"><div className="flex aspect-[4/5] items-center justify-center bg-blue-950/50">{card.image ? <img src={card.image} alt="" loading="lazy" className="h-full w-full object-contain" /> : <span className="text-xs text-blue-100">No art</span>}</div><div className="px-2 py-1.5"><span className="block text-xs font-semibold leading-tight">{card.base_name ?? card.name}</span><span className="mt-0.5 block text-[11px] text-orange-300">{card.form === 1 ? 'Evolution' : card.form === 2 ? 'Hero' : used ? 'In deck' : 'Base'}</span></div></button>; })}</div>{visible.length === 0 && <p className="py-12 text-center text-blue-100">No cards match your search.</p>}</div>
      {onRemove && <div className="border-t border-white/10 p-3 sm:px-5"><button type="button" onClick={() => { onRemove(); onClose(); }} className="min-h-11 w-full rounded-xl border border-white/20 text-sm font-semibold text-blue-100 hover:bg-white/10">Remove card from slot</button></div>}
    </div>
  </div>;
}
