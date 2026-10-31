import { scoreShareSvg, scoreShareText } from '../score-share';
import type { PublicPlayerSnapshot } from '../public-player-types';

const snapshot: PublicPlayerSnapshot = {
  playerTag: '#P0YQ', fetchedAt: '2026-10-22T12:00:00.000Z', firstMatch: null, lastMatch: null,
  availableGames: 25, eligibleGames: 20, scoredGames: 15, wins: 12, losses: 8,
  score: 65, expectedWins: 8, winsAboveExpected: 4, provisional: true, status: 'ready', highlights: [],
};

it('exports the sample, UTC date and limitations without raw battle data', () => {
  const svg = scoreShareSvg(snapshot);
  expect(svg).toContain('15 supported games');
  expect(svg).toContain('2026-10-22 12:00:00 UTC');
  expect(svg).toContain('No overall ranking');
  expect(svg).not.toMatch(/<script|<image|foreignObject/);
  expect(scoreShareText(snapshot)).toContain('Not a global skill ranking');
});

it('labels unavailable scores and rejects invalid tags or timestamps', () => {
  expect(scoreShareSvg({ ...snapshot, score: null })).toContain('Record only');
  expect(scoreShareText({ ...snapshot, score: null })).toContain('Model score unavailable');
  expect(() => scoreShareSvg({ ...snapshot, playerTag: '<script>' })).toThrow();
  expect(() => scoreShareText({ ...snapshot, fetchedAt: 'invalid' })).toThrow();
});
