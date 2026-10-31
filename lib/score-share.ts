import { normalizePlayerTag } from './player-tag';
import type { PublicPlayerSnapshot } from './public-player-types';

function isoDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Snapshot date is invalid.');
  return date.toISOString();
}

export function scoreShareText(snapshot: PublicPlayerSnapshot) {
  const tag = normalizePlayerTag(snapshot.playerTag);
  if (!tag) throw new Error('Snapshot tag is invalid.');
  const score = snapshot.score === null ? 'Model score unavailable' : `${snapshot.score}/100 model-relative performance`;
  return `${tag}: ${score}. ${snapshot.scoredGames} supported games; recent eligible record ${snapshot.wins}W / ${snapshot.losses}L. Provisional snapshot fetched ${isoDate(snapshot.fetchedAt)}. Not a global skill ranking. Check yours on Rival Royale.`;
}

function escape(value: string) { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!); }

/** Self-contained, dated export. No player data is uploaded or persisted. */
export function scoreShareSvg(snapshot: PublicPlayerSnapshot) {
  const tag = normalizePlayerTag(snapshot.playerTag);
  if (!tag) throw new Error('Snapshot tag is invalid.');
  const fetched = isoDate(snapshot.fetchedAt).replace('T', ' ').replace('.000Z', ' UTC');
  const score = snapshot.score === null ? 'Record only' : `${snapshot.score}/100`;
  const line = (x: number, y: number, size: number, value: string, fill = '#ffffff', weight = 500) => `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${escape(value)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="Rival Royale recent performance snapshot"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#202323"/><stop offset="1" stop-color="#202323"/></linearGradient></defs><rect width="1200" height="630" rx="10" fill="url(#bg)"/><rect x="64" y="58" width="8" height="43" rx="4" fill="#ed8654"/>${line(92, 90, 30, 'RIVAL ROYALE', '#e5e0d4', 700)}${line(64, 162, 38, tag, '#ffffff', 700)}${line(64, 208, 24, 'RECENT MODEL-RELATIVE PERFORMANCE', '#c9c2b5')}${line(64, 340, 100, score, '#ffffff', 800)}${line(66, 392, 25, `${snapshot.scoredGames} supported games · provisional snapshot`, '#cbd5e1')}<rect x="790" y="185" width="340" height="230" rx="22" fill="#ffffff" fill-opacity="0.07"/>${line(818, 233, 22, 'RECENT ELIGIBLE RECORD', '#c9c2b5')}${line(818, 305, 49, `${snapshot.wins}W / ${snapshot.losses}L`, '#fdba74', 700)}${line(818, 358, 23, `${snapshot.eligibleGames} analyzed games`, '#cbd5e1')}${line(64, 477, 21, `Fetched ${fetched}`, '#cbd5e1')}${line(64, 519, 20, 'Different opponents and decks. No overall ranking or guaranteed winner.', '#cbd5e1')}${line(64, 580, 23, 'rival-royale.com · Check your recent games', '#e5e0d4', 700)}</svg>`;
}
