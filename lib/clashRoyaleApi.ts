import { ClashRoyalePlayer, ClashRoyaleBattle } from './types';
import { serialize, deserialize } from 'node:v8';

// used as proxy server to get a static IP address 
const API_BASE_URL = 'https://proxy.royaleapi.dev/v1';

// Scheduled workers pace every upstream attempt across their bounded user pool.
// Web requests retain their existing behavior when the interval is unset.
let requestQueue = Promise.resolve();
let nextRequestAt = 0;
const workerCache = new Map<string, { value?: Buffer; error?: Error; bytes: number }>();
const workerInflight = new Map<string, Promise<ClashRoyaleBattle[]>>();
const workerTags = new Set<string>();
let workerCacheBytes = 0;
const apiMetrics = { requests: 0, retries: 0, rateLimited: 0, cacheHits: 0, cacheMisses: 0, cacheEvictions: 0, responseMs: 0, maxResponseMs: 0, statuses: {} as Record<string, number> };
export function getClashApiMetrics() { return { ...apiMetrics, statuses: { ...apiMetrics.statuses }, uniquePlayerTags: workerTags.size, cachedPlayers: workerCache.size, cacheBytes: workerCacheBytes }; }
function reserveApiSlot() {
  const interval = Number(process.env.CLASH_REQUEST_INTERVAL_MS || 0);
  if (!Number.isFinite(interval) || interval <= 0) return Promise.resolve();
  const slot = requestQueue.then(async () => {
    const wait = nextRequestAt - Date.now();
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
    nextRequestAt = Date.now() + Math.min(interval, 10000);
  });
  requestQueue = slot;
  return slot;
}

async function fetchFromApi(endpoint: string, attempts = 3, timeoutMs = 10000) {
  const apiKey = process.env.CLASH_ROYALE_API_KEY;
  
  if (!apiKey) {
    throw new Error('CLASH_ROYALE_API_KEY is not configured');
  }

  // The cron can request several tracked players' logs at once. A brief 429
  // should not leave their history stale until the next daily run.
  for (let attempt = 0; attempt < attempts; attempt++) {
    await reserveApiSlot();
    apiMetrics.requests++;
    if (attempt > 0) apiMetrics.retries++;
    const started = Date.now();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(timeoutMs) : undefined,
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    const elapsed = Date.now() - started;
    apiMetrics.responseMs += elapsed;
    apiMetrics.maxResponseMs = Math.max(apiMetrics.maxResponseMs, elapsed);
    apiMetrics.statuses[String(response.status)] = (apiMetrics.statuses[String(response.status)] || 0) + 1;
    if (response.status === 429) apiMetrics.rateLimited++;

    if (response.ok) return response.json();
    if (response.status === 429 && attempt < attempts - 1) {
      const retryAfter = Number(response.headers.get('retry-after'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 3000)
        : 1000 * (attempt + 1);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      continue;
    }
    const errorText = await response.text();
    throw new Error(`Clash Royale API error: ${response.status} - ${errorText}`);
  }
  throw new Error('Clash Royale API retry limit reached');
}

/** Public snapshots have one bounded attempt; scheduled collection keeps its retries. */
export async function getPlayerBattleLogSnapshot(playerTag: string): Promise<unknown[]> {
  const data = await fetchFromApi(`/players/${encodeURIComponent(playerTag)}/battlelog`, 1, 8000);
  if (!Array.isArray(data)) throw new Error('Invalid battle log');
  return data.slice(0, 50);
}

export async function getPlayerInfo(playerTag: string): Promise<ClashRoyalePlayer> {
  // encodeURIComponent already converts # to %23
  const encodedTag = encodeURIComponent(playerTag);
  const data = await fetchFromApi(`/players/${encodedTag}`);
  return data;
}

export async function getPlayerBattleLog(playerTag: string): Promise<ClashRoyaleBattle[]> {
  // encodeURIComponent already converts # to %23
  if (!process.env.SYNC_JOB_MODE) return (await fetchFromApi(`/players/${encodeURIComponent(playerTag)}/battlelog`)) || [];
  const tag = '#' + playerTag.trim().replace(/^#/, '').toUpperCase();
  workerTags.add(tag);
  const cached = workerCache.get(tag);
  if (cached) {
    apiMetrics.cacheHits++;
    workerCache.delete(tag); workerCache.set(tag, cached);
    if (cached.error) throw cached.error;
    return deserialize(cached.value!) as ClashRoyaleBattle[];
  }
  const pending = workerInflight.get(tag);
  if (pending) { apiMetrics.cacheHits++; return pending; }
  apiMetrics.cacheMisses++;
  const put = (entry: { value?: Buffer; error?: Error; bytes: number }) => {
    while (workerCache.size && (workerCacheBytes + entry.bytes > 128 * 1024 * 1024 || workerCache.size >= 5000)) {
      const oldest = workerCache.keys().next().value!;
      workerCacheBytes -= workerCache.get(oldest)!.bytes;
      workerCache.delete(oldest); apiMetrics.cacheEvictions++;
    }
    if (entry.bytes <= 128 * 1024 * 1024) { workerCache.set(tag, entry); workerCacheBytes += entry.bytes; }
  };
  const promise = (async () => {
    try {
      const raw = await fetchFromApi(`/players/${encodeURIComponent(tag)}/battlelog`);
      if (!Array.isArray(raw)) throw new Error('Invalid battle log');
      // Image URLs are unused by normalization/Elo; avoid retaining repeated URLs in job memory.
      const compactCard = (card: any) => { const copy = { ...card }; delete copy.iconUrls; return copy; };
      const player = (row: any) => ({ ...row, cards: row.cards?.map(compactCard), supportCards: row.supportCards?.map(compactCard) });
      const data = raw.map(row => ({ ...row, team: row.team?.map(player), opponent: row.opponent?.map(player) }));
      // Serialized buffers keep bounded cached payloads outside V8's object heap.
      const serialized = serialize(data);
      put({ value: serialized, bytes: serialized.byteLength });
      return data;
    } catch (error) {
      if (error instanceof Error && /API error: 404/.test(error.message)) put({ error, bytes: 256 });
      throw error;
    } finally { workerInflight.delete(tag); }
  })();
  workerInflight.set(tag, promise);
  return promise;
  
}

