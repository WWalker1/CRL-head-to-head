'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { complete, counter, fetchCatalog, fetchExamples, predict } from './api';
import type { CatalogVariant, Deck, DeckCard, ModelCatalog, ModelResult } from './types';
import VisualDeckForm from './VisualDeckForm';
import { buildClashDeckLink, CLASH_DECK_IMPORT_NOTICE } from '@/lib/clash-deck-link';

type Mode = 'matchup' | 'counter' | 'builder';
type Example = { name?: string; decks?: Deck[] };
type FriendTarget = { deck: Deck; weight: number; label: string; count: number };

const EMPTY_CARD: DeckCard = { key: '', level: 16 };
const FALLBACK_TOWER = 159000000;

function normalizeCatalog(payload: ModelCatalog & { catalog?: ModelCatalog; data?: ModelCatalog }) {
  const value = payload.catalog ?? payload.data ?? payload;
  return { variants: Array.isArray(value.variants) ? value.variants : [], towers: Array.isArray(value.towers) ? value.towers : [] };
}

export function normalizeExamples(payload: unknown): Example[] {
  const value = payload && typeof payload === 'object' && 'examples' in payload ? (payload as { examples: unknown }).examples : payload;
  return Array.isArray(value) ? value.filter((item): item is Example => Boolean(item && typeof item === 'object' && Array.isArray((item as Example).decks))) : [];
}

function cardName(key: string, variants: CatalogVariant[]) { return variants.find((variant) => variant.key === key)?.name ?? key; }

function newDeck(towerId = FALLBACK_TOWER): Deck { return { cards: Array.from({ length: 8 }, () => ({ ...EMPTY_CARD })), tower_id: towerId, tower_level: 16 }; }

function usableDeck(deck: Deck): Deck { return { ...deck, cards: deck.cards.filter((card) => card.key).slice(0, 8) }; }

function getProbability(result: ModelResult | null) {
  if (!result) return null;
  const value = result.probability ?? result.probability_a ?? result.win_probability ?? result.predicted_win_rate ?? result.p_a ?? result.estimate ?? result.score;
  return typeof value === 'number' ? (value > 1 && value <= 100 ? value / 100 : value) : null;
}

function preservesRequiredCards(deck: Deck | undefined, requiredKeys: string[]) {
  if (!deck || !Array.isArray(deck.cards)) return false;
  const keys = new Set(deck.cards.map((card) => card.key));
  return requiredKeys.every((key) => keys.has(key));
}

function counterExportUrl(deck: Deck | undefined) {
  if (!deck || deck.cards.length !== 8) return null;
  try {
    return buildClashDeckLink(deck);
  } catch {
    return null;
  }
}

function CounterDeckExport({ deck }: { deck: Deck }) {
  const url = counterExportUrl(deck);
  if (!url) return null;
  return <div className="mt-3">
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 text-sm font-bold text-white transition hover:bg-orange-700 sm:w-auto">Export to Clash Royale</a>
    <p className="mt-2 text-xs leading-5 text-slate-400">{CLASH_DECK_IMPORT_NOTICE}</p>
  </div>;
}

function ResultPanel({ result, mode, variants, onApply, unequalLevels }: { result: ModelResult | null; mode: Mode; variants: CatalogVariant[]; onApply?: (deck: Deck) => void; unequalLevels?: boolean }) {
  if (!result) return null;
  const probability = getProbability(result);
  const candidateList = Array.isArray(result.candidates) ? result.candidates : [];
  const returnedDeck = result.deck ?? (Array.isArray(result.decks) ? result.decks[0] : undefined);
  return (
    <section className="mt-8 rounded-3xl border border-blue-300/20 bg-slate-950/75 p-5 text-slate-100 shadow-2xl shadow-blue-950/30 sm:p-7" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Model readout</p><h2 className="mt-1 text-2xl font-bold tracking-tight">{mode === 'matchup' ? 'Matchup estimate' : mode === 'counter' ? 'Counter candidates' : 'Completion candidates'}</h2></div>
        {result.model_version && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">Model {result.model_version}</span>}
      </div>
      {probability !== null && <div className="mt-6 rounded-2xl bg-gradient-to-br from-blue-500/25 to-orange-500/10 p-5"><p className="text-sm text-slate-300">Estimated win chance for deck A</p><p className="mt-1 text-5xl font-black tabular-nums text-white">{Math.round(probability * 100)}<span className="text-2xl text-blue-300">%</span></p>{mode === 'matchup' && <p className="mt-1 text-sm text-slate-300">Deck B: {Math.round((1 - probability) * 100)}%</p>}<div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-orange-400" style={{ width: `${Math.max(0, Math.min(1, probability)) * 100}%` }} /></div></div>}
      {mode === 'matchup' && unequalLevels && <p className="mt-4 rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">Level effects in this model have not been validated. A test with identical decks at levels 11 and 13 returned almost 50/50, so this estimate may understate a real level advantage.</p>}
      {returnedDeck && <><DeckPreview deck={returnedDeck} variants={variants} title="Suggested deck" />{mode === 'counter' && <CounterDeckExport deck={returnedDeck} />}{onApply && <button type="button" onClick={() => onApply(returnedDeck)} className="mt-4 h-11 rounded-xl border border-blue-300/30 bg-blue-400/10 px-4 text-sm font-semibold text-blue-100 transition hover:bg-blue-400/20">Use this deck</button>}</>}
      {result.explanation && <p className="mt-5 rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-sm leading-6 text-slate-300">{result.explanation}</p>}
      {candidateList.length > 0 && <div className="mt-6 space-y-4"><p className="text-sm font-semibold text-slate-300">Search candidates</p>{candidateList.slice(0, 5).map((candidate, index) => { const score = candidate.probability ?? candidate.win_probability ?? candidate.score; return <div key={index} className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="text-sm text-slate-200">Option {index + 1}</span><span className="flex items-center gap-2 font-semibold text-blue-200">{typeof score === 'number' ? `${Math.round((score > 1 ? score : score * 100))}%` : 'Scored'}{candidate.support && <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">{candidate.support}</span>}</span></div>{candidate.explanation && <p className="mt-2 text-xs leading-5 text-slate-400">{candidate.explanation}</p>}{candidate.deck && <><DeckPreview deck={candidate.deck} variants={variants} title="" />{mode === 'counter' && <CounterDeckExport deck={candidate.deck} />}{onApply && <button type="button" onClick={() => onApply(candidate.deck!)} className="mt-3 h-10 rounded-xl border border-blue-300/30 bg-blue-400/10 px-3 text-xs font-semibold text-blue-100 hover:bg-blue-400/20">Use option {index + 1}</button>}</>}</div>; })}</div>}
      {(result.evaluated !== undefined || result.opponents_evaluated !== undefined || result.elapsed_ms !== undefined || (result.objective === 'historical_training_meta')) && <p className="mt-5 text-xs leading-5 text-slate-500">{result.evaluated !== undefined ? `${result.evaluated} candidates evaluated` : ''}{result.opponents_evaluated !== undefined ? ` · ${result.opponents_evaluated} opponents compared` : ''}{result.elapsed_ms !== undefined ? ` · ${result.elapsed_ms}ms` : ''}{(result.objective === 'historical_training_meta') ? ' · historical training context' : ''}</p>}
      {typeof result.warning === 'string' && <p className="mt-4 text-sm text-amber-200">{result.warning}</p>}
      {Array.isArray(result.warnings) && result.warnings.map((warning, index) => <p key={index} className="mt-2 text-sm text-amber-200">{String(warning)}</p>)}
      {result.diagnostics && <p className="mt-5 text-xs leading-5 text-slate-500">Search coverage and support signals are included in the model response. Results are conditional estimates from the available training coverage.</p>}
    </section>
  );
}

function DeckPreview({ deck, variants, title }: { deck: Deck; variants: CatalogVariant[]; title: string }) {
  return <div className="mt-6"><p className="mb-3 text-sm font-semibold text-slate-300">{title}</p><div className="grid grid-cols-4 gap-2 sm:grid-cols-8">{deck.cards.map((card, index) => <div key={`${card.key}-${index}`} className="overflow-hidden rounded-xl border border-white/10 bg-slate-900"><div className="flex aspect-[3/4] items-center justify-center bg-blue-950/30">{variants.find((variant) => variant.key === card.key)?.image ? <img src={variants.find((variant) => variant.key === card.key)?.image} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-slate-500">{index + 1}</span>}</div><p className="truncate px-1.5 py-1 text-[10px] text-slate-300">{cardName(card.key, variants)}</p></div>)}</div></div>;
}

export default function ModelWorkbench({ mode, title, description }: { mode: Mode; title: string; description: string }) {
  const searchParams = useSearchParams();
  const [catalog, setCatalog] = useState<ModelCatalog>({ variants: [], towers: [] });
  const [examples, setExamples] = useState<Example[]>([]);
  const [deckA, setDeckA] = useState<Deck>(newDeck());
  const [deckB, setDeckB] = useState<Deck>(newDeck());
  const [locked, setLocked] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [friendTargets, setFriendTargets] = useState<FriendTarget[]>([]);
  const [level, setLevel] = useState(16);
  const [result, setResult] = useState<ModelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef<AbortController | null>(null);
  const requestRevision = useRef(0);
  const towers = catalog.towers.length ? catalog.towers : [{ id: FALLBACK_TOWER, name: 'Tower Princess' }];

  useEffect(() => { const controller = new AbortController(); Promise.allSettled([fetchCatalog(controller.signal), fetchExamples(controller.signal)]).then(([catalogResult, examplesResult]) => { if (catalogResult.status === 'fulfilled') setCatalog(normalizeCatalog(catalogResult.value as ModelCatalog & { catalog?: ModelCatalog; data?: ModelCatalog })); else if ((catalogResult.reason as Error)?.name !== 'AbortError') setError(catalogResult.reason instanceof Error ? catalogResult.reason.message : 'Could not load the model catalog.'); if (examplesResult.status === 'fulfilled') { const parsed = normalizeExamples(examplesResult.value); setExamples(parsed); const first = parsed[0]?.decks; if (mode === 'matchup') { if (first?.[0]) setDeckA(first[0]); if (first?.[1]) setDeckB(first[1]); } } }); return () => controller.abort(); }, [mode]);

  useEffect(() => {
    const friendId = searchParams.get('friendId');
    const selectedKey = searchParams.get('deck');
    if (!friendId) return;
    const controller = new AbortController();
    fetch(`/api/friend-decks?friendId=${encodeURIComponent(friendId)}`, { credentials: 'same-origin', signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error('Friend deck history is unavailable right now.'); return response.json(); })
      .then((payload) => {
        const topDecks = payload?.summary?.topDecks;
        if (!Array.isArray(topDecks)) return;
        const selected = topDecks.find((item: { key?: string }) => item.key === selectedKey) ?? topDecks[0];
        if (!selected) return;
        const parseFriendDeck = (item: { key?: string; cards?: unknown[]; tower?: string | number | null; towerLevel?: number; tower_level?: number }) => { const parsed = typeof item.key === 'string' ? JSON.parse(item.key) as { cards?: Array<{ id: string; form?: string | number | null; level?: number | null }>; tower?: string | number | null } : item; const sourceCards = ((item.cards ?? parsed.cards ?? []) as Array<{ id: string; form?: string | number | null; level?: number | null }>); const cards = sourceCards.map((card) => { const form = card.form === 'evolution' ? 1 : card.form === 'hero' ? 2 : card.form === null || card.form === undefined || card.form === 'base' ? 0 : Number(card.form); if (![0, 1, 2].includes(form)) throw new Error('This recorded deck uses an unsupported card form.'); return { key: `${card.id}:${form}`, level: card.level ?? 16 }; }).slice(0, 8); const towerLevel = Number(item.towerLevel ?? item.tower_level ?? 16); return cards.length === 8 ? { cards, tower_id: Number(parsed.tower) || FALLBACK_TOWER, tower_level: Number.isFinite(towerLevel) ? towerLevel : 16 } : null; };
        const loadedDeck = parseFriendDeck(selected);
        const cards = loadedDeck?.cards ?? [];
        if (cards.length === 8 && loadedDeck) { setDeckA(loadedDeck); setLocked([]); setFriendTargets(topDecks.slice(0, 3).flatMap((item: { key?: string; cards?: unknown[]; count?: number; tower?: string | number | null; towerLevel?: number; tower_level?: number }, index: number) => { if (selectedKey && item !== selected) return []; const deck = parseFriendDeck(item); return deck ? [{ deck, weight: item.count ?? 1, count: item.count ?? 1, label: index === topDecks.indexOf(selected) ? 'Selected recorded deck' : `Recorded deck ${index + 1}` }] : []; })); setResult(null); }
      }).catch((reason: unknown) => { if ((reason as Error)?.name !== 'AbortError') setError(reason instanceof Error ? reason.message : 'Friend deck history is unavailable right now.'); });
    return () => controller.abort();
  }, [searchParams]);

  const invalidate = useCallback(() => { requestRevision.current += 1; requestRef.current?.abort(); requestRef.current = null; setResult(null); setLoading(false); }, []);

  const submit = useCallback(async () => {
    setError(''); invalidate(); const revision = ++requestRevision.current; const controller = new AbortController(); requestRef.current = controller; setLoading(true);
    try { let response: ModelResult; if (mode === 'matchup') response = await predict([usableDeck(deckA), usableDeck(deckB)], controller.signal); else if (mode === 'counter') response = await counter(usableDeck(deckA), locked, level, deckA.tower_id, deckA.tower_level, controller.signal, friendTargets.length ? friendTargets : undefined); else { const selectedKeys = deckA.cards.filter((card) => card.key).map((card) => card.key); response = await complete(selectedKeys, level, deckA.tower_id, deckA.tower_level, controller.signal, excluded); const candidates = Array.isArray(response.candidates) ? response.candidates : []; if (candidates.length === 0 || candidates.some((candidate) => !preservesRequiredCards(candidate.deck, selectedKeys))) throw new Error('The model returned a completion that dropped one of your selected cards. Please retry.'); } if (revision === requestRevision.current && !controller.signal.aborted) setResult(response); } catch (reason: unknown) { if ((reason as Error)?.name !== 'AbortError' && revision === requestRevision.current) setError(reason instanceof Error ? reason.message : 'The model could not complete this request.'); } finally { if (revision === requestRevision.current) setLoading(false); }
  }, [deckA, deckB, excluded, friendTargets, invalidate, level, locked, mode]);

  const loadExample = (example: Example) => { invalidate(); setFriendTargets([]); if (example.decks?.[0]) setDeckA(example.decks[0]); if (example.decks?.[1]) setDeckB(example.decks[1]); };
  const toggleLock = (key: string) => { invalidate(); setLocked((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key].slice(0, 8)); };
  const applyDeck = (next: Deck) => { invalidate(); setFriendTargets([]); setDeckA({ ...next, cards: next.cards.slice(0, 8) }); };
  const submitLabel = loading ? 'Scoring…' : mode === 'matchup' ? 'Score matchup' : mode === 'counter' ? 'Find counters' : 'Complete my deck';
  return <main className="min-h-[calc(100vh-73px)] bg-[#0d1024] px-4 py-10 text-slate-100 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><nav aria-label="Model tools" className="mb-8 flex flex-wrap gap-2 text-sm"><Link href="/matchup" className="rounded-full border border-white/10 px-3 py-2 text-slate-300 hover:border-blue-300/40 hover:text-white">Matchup</Link><Link href="/counter-deck" className="rounded-full border border-white/10 px-3 py-2 text-slate-300 hover:border-blue-300/40 hover:text-white">Counter finder</Link><Link href="/models" className="rounded-full border border-white/10 px-3 py-2 text-slate-300 hover:border-blue-300/40 hover:text-white">Methodology</Link></nav><div className="max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">Model lab · beta</span><h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-6xl">{title}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">{description}</p></div>{error && <div role="alert" className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-300/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"><span>{error}</span><button type="button" onClick={() => window.location.reload()} className="rounded-lg border border-rose-200/20 px-3 py-2 font-semibold hover:bg-rose-300/10">Retry</button></div>}<div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">{mode === 'matchup' ? <><section className="rounded-3xl border border-white/10 bg-slate-950/55 p-5 sm:p-7"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Deck A</p><h2 className="mt-1 text-xl font-bold">Your deck</h2></div><span className="text-xs text-slate-500">8 cards</span></div><VisualDeckForm deck={deckA} variants={catalog.variants} towers={towers} onChange={(next) => { invalidate(); setFriendTargets([]); setDeckA(next); }} /></section><section className="rounded-3xl border border-white/10 bg-slate-950/55 p-5 sm:p-7"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">Deck B</p><h2 className="mt-1 text-xl font-bold">Opponent deck</h2></div><span className="text-xs text-slate-500">8 cards</span></div><VisualDeckForm deck={deckB} variants={catalog.variants} towers={towers} onChange={(next) => { invalidate(); setDeckB(next); }} /></section></> : <section className="rounded-3xl border border-white/10 bg-slate-950/55 p-5 sm:p-7 lg:col-span-2"><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">{mode === 'counter' ? 'Target deck' : 'Starting cards'}</p><h2 className="mt-1 text-xl font-bold">{mode === 'counter' ? 'What do you want to beat?' : 'Build with a few cards'}</h2><p className="mt-2 text-sm text-slate-400">{mode === 'counter' ? 'Choose the complete deck you want to beat.' : 'Every card you choose stays in the completed suggestions. Remove a card if you want the search to replace it.'}</p></div><details className="text-sm text-slate-300"><summary className="min-h-11 cursor-pointer rounded-lg border border-white/15 px-3 py-3">Candidate level · optional</summary><label className="mt-2 flex items-center gap-2">Level<input type="number" min={1} max={16} value={level} onChange={(event) => { invalidate(); setLevel(Number(event.target.value)); }} className="h-11 w-20 rounded-lg border border-white/10 bg-slate-900 px-2 text-base text-white outline-none focus:ring-2 focus:ring-blue-400" /></label></details></div>{mode === 'counter' && friendTargets.length > 0 && <p className="mb-4 text-sm text-blue-200">Comparing against {friendTargets.length} recorded deck(s), weighted by their frequency ({friendTargets.map(target => target.count).join(', ')} games). Editing the shown deck switches to that single target.</p>}<VisualDeckForm deck={deckA} variants={catalog.variants} towers={towers} onChange={(next) => { invalidate(); setFriendTargets([]); setDeckA(next); }} showCardLevels={mode !== 'builder'} /><p className="mt-4 text-xs text-slate-500">{deckA.cards.filter((card) => card.key).length} selected · {catalog.variants.length ? `${catalog.variants.length} canonical card forms available` : 'Loading canonical card forms…'}</p></section>}</div><div className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950/45 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="text-sm text-slate-400"><span className="font-semibold text-slate-200">{mode === 'matchup' ? 'Compare complete decks.' : 'Search checks a bounded set of supported candidates.'}</span><br />Changing a deck clears the previous result.</div><button type="button" onClick={submit} disabled={loading || !catalog.variants.length} className="h-12 rounded-xl bg-blue-500 px-6 text-sm font-bold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50">{loading && <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />}{submitLabel}</button></div>{examples.length > 0 && <div className="mt-6 flex flex-wrap items-center gap-2 text-sm"><span className="mr-1 text-slate-500">Try a fixture:</span>{examples.slice(0, 3).map((example, index) => <button type="button" key={index} onClick={() => loadExample(example)} className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-slate-300 transition hover:border-blue-300/40 hover:text-white">{example.name ?? `Example ${index + 1}`}</button>)}</div>}<ResultPanel result={result} mode={mode} variants={catalog.variants} onApply={applyDeck} unequalLevels={mode === 'matchup' && new Set([...deckA.cards, ...deckB.cards].filter(card => card.key).map(card => card.level).concat(deckA.tower_level, deckB.tower_level)).size > 1} /></div></main>;
}
