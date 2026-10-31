import type { PublicPlayerSnapshot } from './public-player-types';

export type SnapshotComparison = { title: string; explanation: string; difference: number | null };

/** Descriptive comparison only: there is no representative population or skill test. */
export function comparePlayerSnapshots(a: PublicPlayerSnapshot, b: PublicPlayerSnapshot): SnapshotComparison {
  const unavailable = (title: string, explanation: string): SnapshotComparison => ({ title, explanation, difference: null });
  if (a.playerTag === b.playerTag) return unavailable('Choose two different players', 'Both snapshots belong to the same player tag.');
  if (a.score === null || b.score === null || a.status !== 'ready' || b.status !== 'ready') return unavailable('A score is unavailable', 'Both players need supported deck estimates. A recent win rate is not a substitute for a matchup skill score.');
  if (!a.comparisonKey || a.comparisonKey !== b.comparisonKey) return unavailable('Model versions differ', 'These snapshots were not scored with the same model and formula. Wait five minutes and refresh both together.');
  if (a.scoredGames < 10 || b.scoredGames < 10) return unavailable('Too little data to compare', 'At least ten supported games per player are needed for this descriptive comparison. Even then, these short snapshots cannot establish who is the better player.');
  const windows = [a.scoredFirstMatch, a.scoredLastMatch, b.scoredFirstMatch, b.scoredLastMatch].map(value => value ? Date.parse(value) : NaN);
  if (windows.some(value => !Number.isFinite(value)) || windows[0] > windows[1] || windows[2] > windows[3]) return unavailable('Scored dates are unavailable', 'A comparable score needs an explicit time window for both players.');
  if (Math.max(windows[0], windows[2]) > Math.min(windows[1], windows[3])) return unavailable('Different playing windows', 'These scored samples do not overlap in time. Play more games and check again; the separate records remain useful on their own.');
  const difference = Math.round((a.score - b.score) * 10) / 10;
  return {
    title: Math.abs(difference) <= 5 ? 'Similar recent snapshots' : 'Different recent results',
    explanation: `${Math.abs(difference) <= 5 ? 'The displayed scores are within five points. ' : ''}This is a descriptive score difference, not a statistical significance test or an overall winner. Both samples are small, and opponents, decks and playing windows differ.`,
    difference,
  };
}
