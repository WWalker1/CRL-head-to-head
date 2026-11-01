import { FRIEND_HISTORY_LIMIT, normalizeBattle, type FriendHistoryLog } from './friend-history';
import { getPlayerBattleLog } from './clashRoyaleApi';
import { createHash } from 'node:crypto';

export type HistoryCaptureSnapshot = {
  digests: Record<string, string>;
  onSkip?: () => void;
  onWrite?: (rows: number) => void;
};

export type HistorySubject = { userId: string; playerTag: string; friendId?: string };
export function historyTable(subject: HistorySubject) { return subject.friendId ? 'friend_match_history' : 'player_match_history'; }
export function historyConflict(subject: HistorySubject) { return subject.friendId ? 'tracked_friend_id,physical_match_id' : 'user_id,player_tag,physical_match_id'; }
export function historyQuery(client: any, subject: HistorySubject) {
  let query = client.from(historyTable(subject)).select('*').eq('user_id', subject.userId);
  query = subject.friendId ? query.eq('tracked_friend_id', subject.friendId) : query.eq('player_tag', subject.playerTag);
  return query.order('battle_time', { ascending: false }).limit(FRIEND_HISTORY_LIMIT);
}
export function asFriendHistory(row: any): FriendHistoryLog {
  return { ...row, friend_result: row.friend_result ?? row.result, friend_deck: row.friend_deck ?? row.player_deck };
}

export async function persistHistory(client: any, subject: HistorySubject, battles: unknown[], snapshot?: HistoryCaptureSnapshot) {
  const normalized = battles.map(battle => normalizeBattle(battle, subject.playerTag)).filter((row): row is FriendHistoryLog => row !== null);
  // A repeated API record in one batch must not produce two rows with the
  // same conflict key in a single Postgres upsert.
  const unique = [...new Map(normalized.map(row => [row.physical_match_id, row])).values()];
  const subjectType = subject.friendId ? 'friend' : 'player';
  const subjectId = subject.friendId || subject.playerTag;
  const snapshotKey = `${subjectType}:${subjectId}`;
  const digest = createHash('sha256').update(JSON.stringify(['capture-v1', unique.map(row => row.physical_match_id).sort()])).digest('hex');
  if (snapshot?.digests[snapshotKey] === digest) { snapshot.onSkip?.(); return 0; }
  const rows = unique.map(row => {
    if (subject.friendId) return { ...row, user_id: subject.userId, tracked_friend_id: subject.friendId };
    const { friend_result, friend_deck, ...rest } = row;
    return { ...rest, user_id: subject.userId, player_tag: subject.playerTag, result: friend_result, player_deck: friend_deck };
  });
  if (rows.length) {
    const { error } = await client.from(historyTable(subject)).upsert(rows, { onConflict: historyConflict(subject), ignoreDuplicates: true });
    if (error) throw new Error('Could not store match history. Check migration 009.');
    if (snapshot) {
      // Publish the digest only after the complete history upsert has committed successfully.
      const state = await client.from('history_subject_totals').update({ last_log_digest: digest })
        .eq('user_id', subject.userId).eq('subject_type', subjectType).eq('subject_id', subjectId);
      if (state.error) throw new Error('Could not store history snapshot fingerprint.');
      snapshot.digests[snapshotKey] = digest;
      snapshot.onWrite?.(rows.length);
    }
  }
  return rows.length;
}

// Short lived, bounded sharing avoids repeated friend-log fetches in a sync batch.
const logs = new Map<string, { expires: number; promise: ReturnType<typeof getPlayerBattleLog> }>();
export function sharedBattleLog(tag: string) {
  // The standalone worker owns a job-wide serialized cache in the API layer.
  if (process.env.SYNC_JOB_MODE) return getPlayerBattleLog(tag);
  const prior = logs.get(tag);
  if (prior && prior.expires > Date.now()) return prior.promise;
  if (logs.size >= 500) logs.clear();
  const promise = getPlayerBattleLog(tag).catch(error => { logs.delete(tag); throw error; });
  logs.set(tag, { expires: Date.now() + 30000, promise });
  return promise;
}

/** Both manual Sync Battles and the existing daily cron enter here. */
export async function captureUserHistory(client: any, userId: string, playerTag: string, battles: unknown[], friends: Array<{ id: string; friend_player_tag: string }>, snapshot?: HistoryCaptureSnapshot) {
  const errors: string[] = [];
  try { await persistHistory(client, { userId, playerTag }, battles, snapshot); } catch { errors.push('Player match history could not be saved.'); }
  for (const friend of friends) {
    try {
      const recent = friend.friend_player_tag === playerTag ? battles : await sharedBattleLog(friend.friend_player_tag);
      await persistHistory(client, { userId, playerTag: friend.friend_player_tag, friendId: friend.id }, recent, snapshot);
    } catch (error) {
      // Keep the public error generic, but retain the cause in server logs so
      // rate limits and database failures can be distinguished in a cron run.
      console.error('Tracked friend history capture failed:', error);
      errors.push(`History unavailable for tracked friend ${friend.id}.`);
    }
  }
  return errors;
}
