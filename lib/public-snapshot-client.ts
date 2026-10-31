import { normalizePlayerTag } from './player-tag';
import type { PublicPlayerSnapshot, PublicOpponentSnapshot } from './public-player-types';

export async function requestPublicSnapshot(kind: 'player', tag: string, signal: AbortSignal): Promise<PublicPlayerSnapshot>;
export async function requestPublicSnapshot(kind: 'opponents', tag: string, signal: AbortSignal): Promise<PublicOpponentSnapshot>;
export async function requestPublicSnapshot(kind: 'player' | 'opponents', tag: string, signal: AbortSignal) {
  const playerTag = normalizePlayerTag(tag);
  if (!playerTag) throw new Error('Enter a valid player tag from the in-game profile.');
  const response = await fetch(`/api/public-${kind}`, {
    method: 'POST', credentials: 'omit', signal,
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ playerTag }),
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error('Lookup limit reached. Wait before trying again; shared networks can share a limit.');
    if (response.status === 404) throw new Error('Player or public lookup unavailable. Check the tag and try again later.');
    throw new Error('Recent battles are unavailable. Please try again later.');
  }
  const value = await response.json();
  if (!value || value.playerTag !== playerTag || !Number.isFinite(Date.parse(value.fetchedAt))) throw new Error('The lookup returned an incomplete snapshot. Please try again.');
  if (kind === 'opponents' ? !Array.isArray(value.decks) : !Array.isArray(value.highlights) || !Number.isInteger(value.scoredGames)) throw new Error('The lookup returned an incomplete snapshot. Please try again.');
  return value;
}
