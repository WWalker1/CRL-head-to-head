import type { Deck } from "@/components/model-tools/types";

/** Preserve recorded forms and levels; incomplete records must not become invented decks. */
export function recordedDeck(value: unknown): Deck | null {
  if (!value || typeof value !== "object") return null;
  const deck = value as {
    cards?: Array<{ id?: unknown; form?: unknown; level?: unknown }>;
    tower?: unknown;
    towerLevel?: unknown;
    tower_level?: unknown;
  };
  if (!Array.isArray(deck.cards) || deck.cards.length !== 8) return null;
  const cards = deck.cards.map((card) => {
    if (!card || typeof card !== "object") return { key: "", level: NaN };
    const form =
      card.form === "evolution"
        ? 1
        : card.form === "hero"
          ? 2
          : card.form === "base" || card.form == null
            ? 0
            : Number(card.form);
    return { key: `${card.id}:${form}`, level: Number(card.level) };
  });
  const tower = Number(deck.tower);
  const towerLevel = Number(deck.towerLevel ?? deck.tower_level);
  if (
    cards.some(
      (card) =>
        !/^\d+:[012]$/.test(card.key) ||
        !Number.isInteger(card.level) ||
        card.level < 1 ||
        card.level > 16,
    ) ||
    new Set(cards.map((card) => card.key.split(":")[0])).size !== 8 ||
    !Number.isInteger(tower) ||
    tower <= 0 ||
    !Number.isInteger(towerLevel) ||
    towerLevel < 1 ||
    towerLevel > 16
  )
    return null;
  return { cards, tower_id: tower, tower_level: towerLevel };
}
