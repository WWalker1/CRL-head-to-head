'use client';

import { useState } from 'react';
import { summarizeMatchupSkill } from '@/lib/matchup-skill';

export default function SkillScoreExample() {
  const [wins, setWins] = useState(6);
  const [chance, setChance] = useState(50);
  const result = summarizeMatchupSkill(Array.from({ length: 10 }, (_, index) => ({
    physical_match_id: `example-${index}`,
    mode: 'ladder',
    friend_result: index < wins ? 'win' as const : 'loss' as const,
    expected_win_probability: chance / 100,
    prediction_model_version: 'example',
    prediction_eligible: true,
  })), 'example');
  const rawScore = 50 + 100 * result.winsAboveExpected / 10;

  return <section aria-labelledby="example-heading" className="my-8 rounded-2xl border border-violet-200 bg-violet-50 p-5 sm:p-7">
    <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Interactive example · hypothetical games</p>
    <h2 id="example-heading" className="mt-2 text-2xl font-bold text-slate-950">Same wins. Different matchups.</h2>
    <p className="mt-3 leading-7 text-slate-700">For simplicity, these ten games all have the same estimated win chance. Change the results and deck expectation to see why win rate and matchup skill tell different stories. No player data is fetched.</p>
    <div className="mt-5 grid gap-5 sm:grid-cols-2">
      <label className="block font-semibold text-slate-800">Wins in 10 games: {wins}
        <input aria-label="Wins in ten example games" type="range" min="0" max="10" step="1" value={wins} onChange={event => setWins(Number(event.target.value))} className="mt-3 block h-11 w-full accent-violet-700" />
      </label>
      <label className="block font-semibold text-slate-800">Estimated chance per game: {chance}%
        <input aria-label="Estimated win chance per example game" type="range" min="10" max="90" step="5" value={chance} onChange={event => setChance(Number(event.target.value))} className="mt-3 block h-11 w-full accent-violet-700" />
      </label>
    </div>
    <div role="status" aria-atomic="true" className="mt-5 rounded-xl bg-white p-5">
      <p className="text-sm font-semibold text-violet-800">Example matchup skill</p>
      <p className="mt-1 text-4xl font-black text-slate-950">{result.score} / 100</p>
      <p className="mt-3 leading-7 text-slate-700">{wins} actual wins − {result.expectedWins.toFixed(1)} expected wins = {result.winsAboveExpected.toFixed(1)} wins above expectation.</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">Raw score: 50 + 100 × ({result.winsAboveExpected.toFixed(1)} ÷ 10) = {rawScore.toFixed(1)}. The displayed score is limited to 0–100.</p>
    </div>
    <p className="mt-4 text-sm leading-6 text-slate-600">Ten games is a provisional sample. This demonstrates the calculation, not a prediction of your skill or a global player percentile.</p>
  </section>;
}
