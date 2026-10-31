import { comparePlayerSnapshots } from '../player-comparison';
import type { PublicPlayerSnapshot } from '../public-player-types';

function snapshot(tag: string, extra: Partial<PublicPlayerSnapshot> = {}): PublicPlayerSnapshot {
  return { playerTag: tag, fetchedAt: '2026-10-22T12:00:00Z', firstMatch: null, lastMatch: null,
    scoredFirstMatch: '2026-10-20T00:00:00Z', scoredLastMatch: '2026-10-22T00:00:00Z',
    comparisonKey: 'same-model', availableGames: 25, eligibleGames: 25, scoredGames: 20,
    wins: 12, losses: 13, score: 60, expectedWins: 10, winsAboveExpected: 2, provisional: true, status: 'ready', highlights: [], ...extra };
}

it('compares only current-compatible supported samples and never claims an overall winner', () => {
  const result = comparePlayerSnapshots(snapshot('#P0YQ'), snapshot('#P0Y2', { score: 70 }));
  expect(result.difference).toBe(-10);
  expect(result.explanation).toContain('not a statistical significance test or an overall winner');
  expect(comparePlayerSnapshots(snapshot('#P0YQ'), snapshot('#P0Y2', { score: 64 })).title).toBe('Similar recent snapshots');
});

it.each([
  { comparisonKey: 'other-model' }, { comparisonKey: null }, { scoredGames: 2 }, { score: null },
  { status: 'model_unavailable' as const }, { scoredFirstMatch: null },
  { scoredFirstMatch: '2026-09-01T00:00:00Z', scoredLastMatch: '2026-09-02T00:00:00Z' },
])('withholds the difference for incompatible, unsupported or insufficient evidence: %o', extra => {
  expect(comparePlayerSnapshots(snapshot('#P0YQ'), snapshot('#P0Y2', extra)).difference).toBeNull();
});

it('rejects comparison of the same tag', () => {
  expect(comparePlayerSnapshots(snapshot('#P0YQ'), snapshot('#P0YQ')).difference).toBeNull();
});
