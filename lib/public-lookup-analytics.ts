'use client';

import posthog from 'posthog-js';

type LookupEvent =
  | { name: 'public_lookup_started' }
  | { name: 'public_lookup_completed'; eligibleGames: number; scoredGames: number; status: string }
  | { name: 'public_lookup_failed'; reason: 'rate_limited' | 'invalid_tag' | 'not_found' | 'unavailable' | 'timeout' };

/** Deliberately excludes tags, scores, decks, response bodies and error text. */
export function capturePublicLookup(event: LookupEvent) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || !process.env.NEXT_PUBLIC_POSTHOG_HOST) return;
  try {
    const { name, ...properties } = event;
    posthog.capture(name, properties);
  } catch {
    // An analytics failure must not prevent a visitor receiving their result.
  }
}
