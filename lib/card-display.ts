import catalog from '@/models/release-bundle/card-catalog.json';

type DisplayCard = { key: string; name: string; image?: string | null };

const cards = new Map<string, DisplayCard>(catalog.variants.map(card => [card.key, card]));

export function cardDisplay(key: string, recordedName?: string | null): { name: string; image?: string } {
  const card = cards.get(key) ?? cards.get(`${key.split(':')[0]}:0`);
  const id = key.split(':')[0];
  return {
    name: card?.name || recordedName || `Card ${id}`,
    image: card?.image || undefined,
  };
}
