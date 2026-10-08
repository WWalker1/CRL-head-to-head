'use client';

import { useState } from 'react';
import CardPicker from './CardPicker';
import type { CatalogTower, CatalogVariant, Deck } from './types';

export default function VisualDeckForm({ deck, variants, towers, onChange, showCardLevels = true, showLevelCaveat = true }: {
  deck: Deck;
  variants: CatalogVariant[];
  towers: CatalogTower[];
  onChange: (deck: Deck) => void;
  showCardLevels?: boolean;
  showLevelCaveat?: boolean;
}) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const lookup = new Map(variants.map(card => [card.key, card]));
  const replace = (slot: number, key: string) => {
    const cards = [...deck.cards];
    const previous = cards[slot];
    const minimum = lookup.get(key)?.min_level ?? 1;
    cards[slot] = { key, level: Math.max(minimum, previous?.level || 16) };
    onChange({ ...deck, cards });
  };
  const setLevel = (slot: number, level: number) => {
    const cards = [...deck.cards]; cards[slot] = { ...cards[slot], level };
    onChange({ ...deck, cards });
  };
  const setAllLevels = (level: number) => onChange({ ...deck, cards: deck.cards.map(card => ({ ...card, level: Math.max(level, lookup.get(card.key)?.min_level ?? 1) })), tower_level: level });
  return <div>
    <div className="grid grid-cols-4 gap-2 sm:gap-3" role="group" aria-label="Deck card slots">{deck.cards.map((entry, slot) => {
      const card = lookup.get(entry.key);
      return <button key={slot} type="button" onClick={() => setActiveSlot(slot)} aria-label={`Card ${slot + 1}: ${card?.name ?? 'choose a card'}`} className={`group relative min-h-36 overflow-hidden rounded-xl border text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 ${card ? 'border-blue-200/20 bg-slate-900 hover:border-orange-400' : 'border-dashed border-blue-200/30 bg-blue-900/20 hover:border-orange-400 hover:bg-blue-900/30'}`}>
        <span className="absolute left-1.5 top-1.5 z-10 flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-950/85 px-1 text-[11px] font-bold text-white">{slot + 1}</span>
        {card ? <><div className="flex aspect-[4/5] items-center justify-center bg-blue-950/40">{card.image ? <img src={card.image} alt="" loading="lazy" className="h-full w-full object-contain" /> : <span className="text-sm text-blue-100">{card.name}</span>}</div><div className="px-1.5 py-1.5"><span className="block truncate text-xs font-semibold text-white">{card.base_name ?? card.name}</span><span className="block text-[11px] text-orange-300">{card.form === 1 ? 'Evolution' : card.form === 2 ? 'Hero' : 'Base'}{showCardLevels ? ` · Lv ${entry.level}` : ''}</span></div></> : <div className="flex min-h-36 flex-col items-center justify-center gap-1 px-1"><span className="text-3xl text-orange-300">+</span><span className="text-xs font-semibold text-blue-100">Add card</span></div>}
      </button>;
    })}</div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-blue-100/80">{deck.cards.filter(card => card.key).length} / 8 cards selected</p><button type="button" onClick={() => setAdvanced(value => !value)} aria-expanded={advanced} className="min-h-11 rounded-lg border border-blue-200/25 px-3 text-sm font-semibold text-blue-100 hover:border-orange-300">{advanced ? 'Hide' : 'Show'} {showCardLevels ? 'levels & tower' : 'tower options'}</button></div>
    {advanced && <div className="mt-3 space-y-4 rounded-xl border border-blue-200/15 bg-slate-950/45 p-4">{showCardLevels && <div><p className="mb-2 text-sm font-semibold text-blue-100">Card levels {showLevelCaveat && <span className="font-normal text-amber-200"></span>}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setAllLevels(11)} className="min-h-11 rounded-lg border border-blue-200/25 px-3 text-sm text-white hover:border-orange-300">Set all to 11</button><button type="button" onClick={() => setAllLevels(16)} className="min-h-11 rounded-lg border border-blue-200/25 px-3 text-sm text-white hover:border-orange-300">Set all to 16</button></div><p className="mt-2 text-xs leading-5 text-blue-100/70">Leave these alone for an equal-level comparison. The model has not been validated for level gaps.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{deck.cards.map((entry, slot) => entry.key && <label key={slot} className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-white/10 px-3 text-sm text-blue-100"><span className="truncate">{lookup.get(entry.key)?.name ?? `Card ${slot + 1}`}</span><input type="number" aria-label={`Level of card ${slot + 1}`} min={lookup.get(entry.key)?.min_level ?? 1} max={16} value={entry.level} onChange={event => setLevel(slot, Number(event.target.value))} className="h-9 w-16 shrink-0 rounded-md border border-white/15 bg-slate-900 px-2 text-base text-white" /></label>)}</div></div>}
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-blue-100">Tower troop<select value={deck.tower_id} onChange={event => onChange({ ...deck, tower_id: Number(event.target.value) })} className="mt-1.5 h-11 w-full rounded-lg border border-white/15 bg-slate-900 px-3 text-base text-white">{towers.map(tower => <option key={tower.id} value={tower.id}>{tower.name}</option>)}</select></label>{showCardLevels && <label className="text-sm font-semibold text-blue-100">Tower level<input type="number" min={1} max={16} value={deck.tower_level} onChange={event => onChange({ ...deck, tower_level: Number(event.target.value) })} className="mt-1.5 h-11 w-full rounded-lg border border-white/15 bg-slate-900 px-3 text-base text-white" /></label>}</div>
    </div>}
    <CardPicker open={activeSlot !== null} title={`Choose card ${activeSlot === null ? '' : activeSlot + 1}`} variants={variants} selectedKeys={deck.cards.map(card => card.key)} replacingKey={activeSlot === null ? undefined : deck.cards[activeSlot].key} onSelect={key => { if (activeSlot !== null) replace(activeSlot, key); }} onRemove={activeSlot !== null && deck.cards[activeSlot]?.key ? () => { const cards = [...deck.cards]; cards[activeSlot] = { key: '', level: 16 }; onChange({ ...deck, cards }); } : undefined} onClose={() => setActiveSlot(null)} />
  </div>;
}
