export type CatalogVariant = {
  key: string;
  card_id?: number;
  form?: number;
  name: string;
  base_name?: string;
  rarity?: string;
  elixir?: number;
  image?: string;
  min_level?: number;
  champion?: boolean;
};

export type CatalogTower = { id: number; name: string; image?: string };

export type DeckCard = { key: string; level: number };
export type Deck = { cards: DeckCard[]; tower_id: number; tower_level: number };

export type ModelCatalog = {
  variants: CatalogVariant[];
  towers: CatalogTower[];
  [key: string]: unknown;
};

export type ModelResult = {
  [key: string]: unknown;
  model_version?: string;
  probability?: number;
  probability_a?: number;
  win_probability?: number;
  predicted_win_rate?: number;
  p_a?: number;
  estimate?: number;
  score?: number;
  deck?: Deck;
  decks?: Deck[];
  explanation?: string;
  support?: string;
  historical_training_meta?: boolean;
  opponents_evaluated?: number;
  evaluated?: number;
  elapsed_ms?: number;
  candidates?: Array<{ deck?: Deck; score?: number; probability?: number; win_probability?: number; support?: 'observed' | 'experimental' | string; explanation?: string; [key: string]: unknown }>;
  diagnostics?: { [key: string]: unknown };
};
