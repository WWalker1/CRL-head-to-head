"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { requestPublicSnapshot } from "@/lib/public-snapshot-client";
import type { PublicOpponentSnapshot } from "@/lib/public-player-types";
import type { Deck, ModelCatalog } from "./model-tools/types";

export function supportedImportedDeck(
  deck: Deck,
  catalog: ModelCatalog,
): boolean {
  return (
    deck.cards.length === 8 &&
    new Set(deck.cards.map((card) => card.key.split(":")[0])).size === 8 &&
    deck.cards.every((card) => {
      const variant = catalog.variants.find((item) => item.key === card.key);
      return (
        variant &&
        Number.isInteger(card.level) &&
        card.level >= (variant.min_level ?? 1) &&
        card.level <= 16
      );
    }) &&
    catalog.towers.some((tower) => tower.id === deck.tower_id) &&
    Number.isInteger(deck.tower_level) &&
    deck.tower_level >= 1 &&
    deck.tower_level <= 16
  );
}

export default function RecentOpponentImport({
  catalog,
  onSelect,
}: {
  catalog: ModelCatalog;
  onSelect: (deck: Deck) => void;
}) {
  const [tag, setTag] = useState("");
  const [snapshot, setSnapshot] = useState<PublicOpponentSnapshot | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [],
  );

  async function lookup(event: FormEvent) {
    event.preventDefault();
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setSnapshot(null);
    setError("");
    setMessage("");
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15000);
    try {
      const value = await requestPublicSnapshot(
        "opponents",
        tag,
        controller.signal,
      );
      if (!controller.signal.aborted) setSnapshot(value);
    } catch (reason) {
      if (
        active.current === controller &&
        (!controller.signal.aborted || timedOut)
      )
        setError(
          timedOut
            ? "The lookup took too long. Try again shortly."
            : reason instanceof Error
              ? reason.message
              : "Opponent decks unavailable.",
        );
    } finally {
      clearTimeout(timer);
      if (active.current === controller) setLoading(false);
    }
  }

  return (
    <section
      className="mt-3 border-t border-white/10 pt-4"
      aria-labelledby="opponent-import-heading"
    >
      <h2 id="opponent-import-heading" className="text-xl font-bold text-white">
        Counter a recent opponent
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        Enter your tag, then choose one of the latest five eligible opponent
        decks. Importing does not run a counter search or start tracking.
      </p>
      <form
        onSubmit={lookup}
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="flex-1 text-sm font-semibold text-slate-200">
          Your player tag
          <input
            required
            value={tag}
            maxLength={16}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={loading}
            onChange={(event) => {
              setTag(event.target.value);
              setSnapshot(null);
              setMessage("");
            }}
            placeholder="#P0YQ"
            className="ph-no-capture mt-2 block min-h-12 w-full rounded-xl border border-white/20 bg-slate-950 px-4 uppercase text-white"
          />
        </label>
        <button
          disabled={loading}
          className="min-h-12 rounded-xl bg-[#c24719] px-5 font-bold text-white disabled:opacity-60"
        >
          {loading ? "Finding decks…" : "Find recent opponent decks"}
        </button>
      </form>
      <div aria-live="polite" aria-busy={loading}>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-orange-200">
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="mt-4 text-sm text-emerald-200">
            {message}
          </p>
        ) : null}
        {snapshot ? (
          <div className="mt-5 space-y-3">
            <p className="text-xs text-slate-400">
              Public snapshot for {snapshot.playerTag}, fetched{" "}
              {new Date(snapshot.fetchedAt).toLocaleString()}. May be reused for
              five minutes.
            </p>
            {!snapshot.decks.length ? (
              <p className="text-sm text-slate-200">
                No complete eligible opponent decks are available. Draft, team
                games and incomplete tower/card data are excluded. You can still
                choose a target manually.
              </p>
            ) : (
              snapshot.decks.map((entry, index) => {
                const supported = supportedImportedDeck(entry.deck, catalog);
                return (
                  <div
                    key={`${entry.date}-${index}`}
                    className="rounded-xl border border-white/15 bg-slate-950/50 p-4"
                  >
                    <p className="text-sm font-semibold text-white">
                      {index === 0
                        ? "Latest eligible opponent"
                        : `Recent opponent ${index + 1}`}{" "}
                      · {entry.result === "win" ? "You won" : "You lost"} ·{" "}
                      {new Date(entry.date).toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {entry.cardNames.join(", ")}
                    </p>
                    <button
                      type="button"
                      disabled={!supported}
                      onClick={() => {
                        onSelect(entry.deck);
                        setMessage(
                          "Opponent deck loaded below. Review its cards, forms, levels and tower, then choose Find counters.",
                        );
                      }}
                      className="mt-3 min-h-11 rounded-lg border border-stone-400/40 px-4 text-sm font-bold text-stone-100 disabled:opacity-50"
                    >
                      Use opponent deck {index + 1}
                    </button>
                    {!supported ? (
                      <p className="mt-2 text-xs text-orange-200">
                        This deck is not supported by the loaded catalog. Its
                        forms, levels or tower will not be replaced with
                        guesses.
                      </p>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
