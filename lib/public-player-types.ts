export type PublicPlayerSnapshot = {
  playerTag: string;
  fetchedAt: string;
  firstMatch: string | null;
  lastMatch: string | null;
  availableGames: number;
  eligibleGames: number;
  scoredGames: number;
  wins: number;
  losses: number;
  score: number | null;
  expectedWins: number;
  winsAboveExpected: number;
  provisional: boolean;
  /** Opaque model/cutoff/formula identifier. */
  comparisonKey?: string | null;
  scoredFirstMatch?: string | null;
  scoredLastMatch?: string | null;
  status: 'ready' | 'model_unavailable' | 'no_supported_games';
  highlights: Array<{
    date: string;
    result: 'win' | 'loss';
    expectedWinProbability: number;
    cards: Array<{ id: string; name: string | null; form: string }>;
  }>;
};

export type PublicOpponentSnapshot = {
  playerTag: string;
  fetchedAt: string;
  decks: Array<{
    date: string;
    result: 'win' | 'loss';
    deck: { cards: Array<{ key: string; level: number }>; tower_id: number; tower_level: number };
    cardNames: string[];
  }>;
};
