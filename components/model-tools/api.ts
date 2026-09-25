import type { Deck, ModelCatalog, ModelResult } from './types';

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload ? String((payload as { error: unknown }).error) : typeof payload?.detail === 'string' ? payload.detail : `Request failed (${response.status})`;
    throw new Error(response.status === 401 ? 'Sign in to use the model tools.' : message);
  }
  return payload as T;
}

export async function fetchCatalog(signal?: AbortSignal) {
  return readJson<ModelCatalog>(await fetch('/api/model/catalog', { signal, credentials: 'same-origin' }));
}

export async function fetchExamples(signal?: AbortSignal) {
  return readJson<unknown>(await fetch('/api/model/examples', { signal, credentials: 'same-origin' }));
}

export async function predict(decks: [Deck, Deck], signal?: AbortSignal) {
  return readJson<ModelResult>(await fetch('/api/model/predict', { method: 'POST', credentials: 'same-origin', signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decks }) }));
}

export async function counter(target: Deck, locked: string[], level: number, towerId: number, towerLevel: number, signal?: AbortSignal, targets?: Array<{ deck: Deck; weight: number }>) {
  return readJson<ModelResult>(await fetch('/api/model/counter', { method: 'POST', credentials: 'same-origin', signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...(targets?.length ? { targets } : { target }), locked, level, tower_id: towerId, tower_level: towerLevel }) }));
}

export async function complete(locked: string[], level: number, towerId: number, towerLevel: number, signal?: AbortSignal, excluded: string[] = []) {
  return readJson<ModelResult>(await fetch('/api/model/complete', { method: 'POST', credentials: 'same-origin', signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ locked, excluded, level, tower_id: towerId, tower_level: towerLevel }) }));
}
