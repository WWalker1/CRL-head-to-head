import { randomBytes } from 'crypto';
import type { FriendHistorySummary } from './friend-history';

export interface RivalrySnapshot {
  friendName: string;
  friendTag: string;
  record: { wins: number; losses: number };
  window: { recordedMatches: number; topDeckCoverage: number; firstObserved: string | null; lastObserved: string | null; trackedSince: string | null; asOf: string };
  topDecks?: FriendHistorySummary['topDecks'];
  createdAt: string;
}

export function createShareId() { return randomBytes(18).toString('base64url'); }
export function createSnapshot(friend: { friend_name: string; friend_player_tag: string; total_wins: number; total_losses: number; created_at?: string | null }, history: FriendHistorySummary, includeDecks = false): RivalrySnapshot {
  return { friendName: friend.friend_name, friendTag: friend.friend_player_tag,
    record: { wins: friend.total_wins, losses: friend.total_losses },
    window: { recordedMatches: history.recordedMatches, topDeckCoverage: history.coverage, firstObserved: history.firstObserved, lastObserved: history.lastObserved, trackedSince: friend.created_at || null, asOf: new Date().toISOString() },
    ...(includeDecks ? { topDecks: history.topDecks } : {}), createdAt: new Date().toISOString() };
}
