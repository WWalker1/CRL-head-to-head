import { normalizeBattle, type FriendHistoryLog } from './friend-history';
import { getPlayerBattleLog } from './clashRoyaleApi';

export type HistorySubject = { userId: string; playerTag: string; friendId?: string };
export function historyTable(subject: HistorySubject) { return subject.friendId ? 'friend_match_history' : 'player_match_history'; }
export function historyConflict(subject: HistorySubject) { return subject.friendId ? 'tracked_friend_id,physical_match_id' : 'user_id,player_tag,physical_match_id'; }
export function historyQuery(client: any, subject: HistorySubject) {
  let query = client.from(historyTable(subject)).select('*').eq('user_id', subject.userId);
  query = subject.friendId ? query.eq('tracked_friend_id', subject.friendId) : query.eq('player_tag', subject.playerTag);
  return query.order('battle_time', { ascending: false }).limit(100);
}
export function asFriendHistory(row: any): FriendHistoryLog {
  return { ...row, friend_result: row.friend_result ?? row.result, friend_deck: row.friend_deck ?? row.player_deck };
}

export async function persistHistory(client: any, subject: HistorySubject, battles: unknown[]) {
  const normalized = battles.map(battle => normalizeBattle(battle, subject.playerTag)).filter((row): row is FriendHistoryLog => row !== null);
  const rows = normalized.map(row => {
    if (subject.friendId) return { ...row, user_id: subject.userId, tracked_friend_id: subject.friendId };
    const { friend_result, friend_deck, ...rest } = row;
    return { ...rest, user_id: subject.userId, player_tag: subject.playerTag, result: friend_result, player_deck: friend_deck };
  });
  if (rows.length) {
    const { error } = await client.from(historyTable(subject)).upsert(rows, { onConflict: historyConflict(subject), ignoreDuplicates: true });
    if (error) throw new Error('Could not store match history. Check migration 009.');
  }
  return rows.length;
}

// Short lived, bounded sharing avoids repeated friend-log fetches in a sync batch.
const logs = new Map<string, { expires: number; promise: ReturnType<typeof getPlayerBattleLog> }>();
export function sharedBattleLog(tag: string) {
  const prior = logs.get(tag);
  if (prior && prior.expires > Date.now()) return prior.promise;
  if (logs.size >= 500) logs.clear();
  const promise = getPlayerBattleLog(tag).catch(error => { logs.delete(tag); throw error; });
  logs.set(tag, { expires: Date.now() + 30000, promise });
  return promise;
}

/** Both manual Sync Battles and the existing daily cron enter here. */
export async function captureUserHistory(client: any, userId: string, playerTag: string, battles: unknown[], friends: Array<{ id: string; friend_player_tag: string }>) {
  const errors: string[] = [];
  try { await persistHistory(client, { userId, playerTag }, battles); } catch { errors.push('Player match history could not be saved.'); }
  for (const friend of friends) {
    try {
      const recent = friend.friend_player_tag === playerTag ? battles : await sharedBattleLog(friend.friend_player_tag);
      await persistHistory(client, { userId, playerTag: friend.friend_player_tag, friendId: friend.id }, recent);
    } catch { errors.push(`History unavailable for tracked friend ${friend.id}.`); }
  }
  return errors;
}
