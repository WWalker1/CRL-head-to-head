import type { MatchupSkillSummary } from '@/lib/matchup-skill';

export default function MatchupSkill({ skill, status, dark = false }: { skill: MatchupSkillSummary; status?: string; dark?: boolean }) {
  const modelScore = skill.score !== null;
  const score = skill.score ?? skill.recordScore;
  const value = score === null ? '—' : Math.round(score).toString();
  const ring = score === null ? 0 : Math.max(0, Math.min(100, score));

  return <section className={`rounded-2xl border p-4 sm:p-6 ${dark ? 'border-violet-300/20 bg-gradient-to-br from-violet-800/30 via-indigo-950/70 to-slate-950 text-white' : 'border-violet-200 bg-gradient-to-br from-violet-50 to-white text-slate-900'}`} aria-label="Matchup skill score">
    <div className="flex flex-wrap items-center gap-5 sm:gap-8">
      <div className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full p-2 shadow-lg shadow-violet-950/20 sm:h-44 sm:w-44" style={{ background: `conic-gradient(#fb923c ${ring}%, ${dark ? '#312e81' : '#ddd6fe'} ${ring}%)` }}>
        <div className={`flex h-full w-full flex-col items-center justify-center rounded-full ${dark ? 'bg-[#15112d]' : 'bg-white'}`}>
          <span className="text-5xl font-black tabular-nums tracking-tight sm:text-6xl">{value}</span>
          <span className={`text-xs font-semibold uppercase tracking-widest ${dark ? 'text-violet-200' : 'text-violet-700'}`}>out of 100</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-bold uppercase tracking-[0.18em] ${dark ? 'text-orange-300' : 'text-violet-700'}`}>{modelScore ? 'Matchup skill · beta' : 'Recent battle record'}</p>
        <h2 className="mt-2 text-xl font-bold sm:text-2xl">{score === null ? 'Play to get your score' : modelScore ? 'Results vs expectation' : 'Your last 100 games'}</h2>
        <p className={`mt-2 text-sm ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{modelScore ? `${skill.actualWins} wins · ${skill.winsAboveExpected >= 0 ? '+' : ''}${skill.winsAboveExpected.toFixed(1)} vs expected` : score !== null ? `${skill.recordWins} wins · ${skill.recordLosses} losses` : 'Sync your battles to see your results.'}</p>
        {modelScore && <p className={`mt-1 text-sm ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{skill.toughWins} wins in {skill.toughMatches} tough matchups</p>}
        {score !== null && !modelScore && <p className={`mt-1 text-xs ${dark ? 'text-violet-200' : 'text-violet-700'}`}>A smoothed win record while model estimates accumulate.</p>}
      </div>
    </div>
    <details className={`mt-4 border-t pt-3 text-xs leading-5 ${dark ? 'border-white/10 text-slate-400' : 'border-violet-200 text-slate-600'}`}>
      <summary className="cursor-pointer font-semibold">What does this number mean?</summary>
      <p className="mt-2">{modelScore ? `${skill.scoredMatches} supported matches scored${skill.provisional ? ' · provisional until 30 scored games' : ''}. The score compares your wins with the model’s expected wins; 50 is neutral. It is not a pure measure of player skill.` : 'This number is based on your recent win–loss record and moves toward 50 when few games are recorded. It is not a model-based matchup skill estimate.'} Opponent skill, balance changes, and in-game choices affect results. {status}</p>
    </details>
  </section>;
}
