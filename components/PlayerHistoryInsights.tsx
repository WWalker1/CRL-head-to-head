'use client';
import { useEffect, useState } from 'react';
import MatchupSkill from './MatchupSkill';
import type { MatchupSkillSummary } from '@/lib/matchup-skill';

export default function PlayerHistoryInsights({ revision }: { revision: number }) {
  const [data, setData] = useState<{ skill: MatchupSkillSummary; skillStatus: string } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setError('');
    fetch('/api/player-history', { signal: controller.signal, credentials: 'same-origin' }).then(async response => { if (!response.ok) throw new Error('Your matchup skill will appear after history is configured and synced.'); return response.json(); }).then(setData).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [revision]);
  return <div className="mb-6">{error ? <p className="rounded-lg bg-white p-4 text-sm text-gray-700">{error}</p> : data ? <MatchupSkill skill={data.skill} status={data.skillStatus} /> : <p className="text-sm text-white">Loading matchup skill…</p>}</div>;
}
