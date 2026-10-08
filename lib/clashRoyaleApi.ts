import { ClashRoyalePlayer, ClashRoyaleBattle } from './types';

// used as proxy server to get a static IP address 
const API_BASE_URL = 'https://proxy.royaleapi.dev/v1';

async function fetchFromApi(endpoint: string) {
  const apiKey = process.env.CLASH_ROYALE_API_KEY;
  
  if (!apiKey) {
    throw new Error('CLASH_ROYALE_API_KEY is not configured');
  }

  // The cron can request several tracked players' logs at once. A brief 429
  // should not leave their history stale until the next daily run.
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) return response.json();
    if (response.status === 429 && attempt < 2) {
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

