import { ClashRoyalePlayer, ClashRoyaleBattle } from './types';

// used as proxy server to get a static IP address 
const API_BASE_URL = 'https://proxy.royaleapi.dev/v1';

// Scheduled workers pace every upstream attempt across their bounded user pool.
// Web requests retain their existing behavior when the interval is unset.
let requestQueue = Promise.resolve();
let nextRequestAt = 0;
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
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(timeoutMs) : undefined,
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

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
  const encodedTag = encodeURIComponent(playerTag);
  const data = await fetchFromApi(`/players/${encodedTag}/battlelog`);
  return data || [];  // modified to return data not data.items (show AI structure of games)
  
}

