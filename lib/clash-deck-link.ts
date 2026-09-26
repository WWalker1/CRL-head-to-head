/** The Clash Royale deck link imports card identities only. */
export const CLASH_DECK_IMPORT_NOTICE =
  'Check Evolution and Hero forms, tower troop, and card levels in Clash Royale after importing.';

export type ClashDeckInput = {
  cards: ReadonlyArray<{ key: string }>;
  tower_id?: number;
};

/** Build the share/import link from eight canonical model card keys (ID:form). */
export function buildClashDeckLink(deck: ClashDeckInput): string {
  if (!Array.isArray(deck.cards) || deck.cards.length !== 8) {
    throw new Error('A Clash Royale deck must contain exactly eight cards.');
  }

  const ids = deck.cards.map(({ key }) => {
    const match = /^([1-9]\d*):([0-2])$/.exec(key);
    if (!match) throw new Error('Deck contains an invalid canonical card key.');
    return match[1];
  });

  if (new Set(ids).size !== 8) {
    throw new Error('A Clash Royale deck cannot contain duplicate base cards.');
  }

  // The public deck link carries base card IDs. It has no verified form,
  // level, or tower encoding, so we do not append those details.
  return `https://link.clashroyale.com/deck/en?deck=${ids.join(';')}`;
}
