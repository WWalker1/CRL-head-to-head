import { summarizeFriendHistory } from './friend-history';
import { summarizeMatchupSkill } from './matchup-skill';
import { buildPlayerStats } from './player-stats';
import { asFriendHistory, historyConflict, historyQuery, historyTable, type HistorySubject } from './history-storage';

function modelDeck(deck: any) {
  if (!deck || deck.cards?.length !== 8 || !deck.tower || !Number.isInteger(deck.towerLevel)) return null;
  const cards = deck.cards.map((card: any) => ({ key: `${card.id}:${card.form ?? 0}`, level: card.level }));
  if (cards.some((card: any) => !/^\d+:[012]$/.test(card.key) || !Number.isInteger(card.level))) return null;
  return { cards, tower_id: Number(deck.tower), tower_level: deck.towerLevel };
}

/** No outcomes or player identity are submitted to the deck predictor. */
export async function readHistoryInsights(client: any, subject: HistorySubject) {
  const { data, error } = await historyQuery(client, subject);
  if (error) throw new Error('History unavailable. Check migration 009.');
  let rows: any[] = data || [];
  const serviceUrl = process.env.MODEL_SERVICE_URL?.replace(/\/$/, '');
  const token = process.env.MODEL_SERVICE_TOKEN;
  let version: string | null = null;
  let skillStatus = 'Configure the model service to calculate matchup skill.';
  if (process.env.MODEL_TOOLS_ENABLED === '1' && serviceUrl && token) {
    try {
      const ready = await fetch(`${serviceUrl}/ready`, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
      if (!ready.ok) throw new Error('not ready');
      const metadata = await ready.json();
      if (typeof metadata.model_version !== 'string' || !Number.isFinite(Date.parse(metadata.training_cutoff))) throw new Error('missing model metadata');
      version = metadata.model_version;
      const pending = rows.filter(row => row.mode === 'ranked' && (row.friend_result ?? row.result) !== 'draw' && Date.parse(row.battle_time) > Date.parse(metadata.training_cutoff) && row.prediction_model_version !== version);
      // 25 pairs fit under the inference service's request byte limit.
      for (let at = 0; at < pending.length; at += 25) {
        const group = pending.slice(at, at + 25);
        const matches = group.flatMap(row => { const a = modelDeck(row.friend_deck ?? row.player_deck); const b = modelDeck(row.opponent_deck); return a && b ? [{ id: row.physical_match_id, decks: [a, b] }] : []; });
        const scores = new Map<string, number>();
        if (matches.length) {
          const response = await fetch(`${serviceUrl}/score-history`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ matches }), cache: 'no-store', signal: AbortSignal.timeout(4000) });
          if (!response.ok) throw new Error('scoring unavailable');
          const prediction = await response.json();
          if (prediction.model_version !== version || prediction.training_cutoff !== metadata.training_cutoff) throw new Error('model changed');
          for (const score of prediction.scores ?? []) if (typeof score.probability === 'number' && Number.isFinite(score.probability) && score.probability >= 0 && score.probability <= 1) scores.set(score.id, score.probability);
        }
        const updated = group.map(row => ({ ...row, expected_win_probability: scores.get(row.physical_match_id) ?? null, prediction_model_version: version, prediction_training_cutoff: metadata.training_cutoff, prediction_eligible: scores.has(row.physical_match_id), prediction_scored_at: new Date().toISOString() }));
        const { error: saveError } = await client.from(historyTable(subject)).upsert(updated, { onConflict: historyConflict(subject) });
        if (saveError) throw new Error('prediction persistence failed');
        const byId = new Map(updated.map(row => [row.physical_match_id, row]));
        rows = rows.map(row => byId.get(row.physical_match_id) ?? row);
      }
      skillStatus = 'Ranked matches after the model training cutoff; unsupported decks and draws are excluded.';
    } catch {
      skillStatus = 'Some matchup estimates are unavailable. Previously scored matches are shown when the model version is known.';
    }
  }
  const history = rows.map(asFriendHistory);
  const skill = summarizeMatchupSkill(history, version);
  return { summary: summarizeFriendHistory(history), skill, skillStatus, stats: buildPlayerStats(rows, version, skill) };
}
