import type { Deck, ModelCatalog, ModelResult } from './types';
import { createClient } from '@/lib/supabase';

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload ? String((payload as { error: unknown }).error) : typeof payload?.detail === 'string' ? payload.detail : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

async function modelHeaders() {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const { data } = await createClient().auth.getSession();
      if (data.session?.access_token) headers.authorization = `Bearer ${data.session.access_token}`;
    } catch { /* Guest searches still work through the public daily allowance. */ }
  }
  return headers;
}

export async function fetchCatalog(signal?: AbortSignal) {
  return readJson<ModelCatalog>(await fetch('/api/model/catalog', { signal, credentials: 'same-origin' }));
}

export async function fetchExamples(signal?: AbortSignal) {
  return readJson<unknown>(await fetch('/api/model/examples', { signal, credentials: 'same-origin' }));
}

export async function predict(decks: [Deck, Deck], signal?: AbortSignal) {
  return readJson<ModelResult>(await fetch('/api/model/predict', { method: 'POST', credentials: 'same-origin', signal, headers: await modelHeaders(), body: JSON.stringify({ decks }) }));
}

export async function counter(target: Deck, locked: string[], level: number, towerId: number, towerLevel: number, signal?: AbortSignal, targets?: Array<{ deck: Deck; weight: number }>) {
  return readJson<ModelResult>(await fetch('/api/model/counter', { method: 'POST', credentials: 'same-origin', signal, headers: await modelHeaders(), body: JSON.stringify({ ...(targets?.length ? { targets } : { target }), locked, level, tower_id: towerId, tower_level: towerLevel }) }));
}

export async function complete(locked: string[], level: number, towerId: number, towerLevel: number, signal?: AbortSignal, excluded: string[] = []) {
  return readJson<ModelResult>(await fetch('/api/model/complete', { method: 'POST', credentials: 'same-origin', signal, headers: await modelHeaders(), body: JSON.stringify({ locked, excluded, level, tower_id: towerId, tower_level: towerLevel }) }));
}
