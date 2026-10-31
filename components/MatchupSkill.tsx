import type { MatchupSkillSummary } from '@/lib/matchup-skill';

export default function MatchupSkill({ skill, status, dark = false, subject = 'Your' }: { skill: MatchupSkillSummary; status?: string; dark?: boolean; subject?: 'Your' | 'Their' }) {
  const modelScore = skill.score !== null;
  const score = skill.score ?? skill.recordScore;
  const value = score === null ? '—' : Math.round(score).toString();
  const ring = score === null ? 0 : Math.max(0, Math.min(100, score));

  return <section className={`rounded-lg border p-4 sm:p-6 ${dark ? 'border-white/15 bg-[#292d2c] text-white' : 'border-stone-300 bg-[#fffdf8] text-slate-900'}`} aria-label="Matchup skill score">
    <div className="flex flex-wrap items-center gap-5 sm:gap-8">
      <div className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full p-2  sm:h-44 sm:w-44" style={{ background: `conic-gradient(#fb923c ${ring}%, ${dark ? '#4a4c46' : '#dedbd2'} ${ring}%)` }}>
        <div className={`flex h-full w-full flex-col items-center justify-center rounded-full ${dark ? 'bg-[#292d2c]' : 'bg-white'}`}>
          <span className="text-5xl font-black tabular-nums tracking-tight sm:text-6xl">{value}</span>
          <span className={`text-xs font-semibold uppercase tracking-widest ${dark ? 'text-stone-300' : 'text-[#a73b13]'}`}>out of 100</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-bold uppercase tracking-[0.18em] ${dark ? 'text-orange-300' : 'text-[#a73b13]'}`}>{modelScore ? 'Matchup skill' : 'Recent battle record'}</p>
        <h2 className="mt-2 text-xl font-bold sm:text-2xl">{score === null ? 'More games needed for a score' : modelScore ? 'Results vs expectation' : `${subject} last 50 games`}</h2>
        {modelScore && skill.provisional && <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${dark ? 'border-orange-300/30 bg-orange-300/10 text-orange-200' : 'border-orange-200 bg-orange-50 text-orange-800'}`}>Early score · {skill.scoredMatches} of 30 games</span>}
        <p className={`mt-2 text-sm ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{modelScore ? `${skill.actualWins} wins · ${skill.winsAboveExpected >= 0 ? '+' : ''}${skill.winsAboveExpected.toFixed(1)} vs expected` : score !== null ? `${skill.recordWins} wins · ${skill.recordLosses} losses` : 'Sync battles to see results.'}</p>
        {modelScore && <p className={`mt-1 text-sm ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{skill.toughWins} wins in {skill.toughMatches} tough matchups</p>}
        {score !== null && !modelScore && <p className={`mt-1 text-xs ${dark ? 'text-stone-300' : 'text-[#a73b13]'}`}>A smoothed win record while model estimates accumulate.</p>}
      </div>
    </div>
    <details className={`mt-4 border-t pt-3 text-xs leading-5 ${dark ? 'border-white/10 text-slate-400' : 'border-violet-200 text-slate-600'}`}>
      <summary className="cursor-pointer font-semibold">What does this number mean?</summary>
      <p className="mt-2">{modelScore ? `${skill.scoredMatches} supported matches scored. The score starts at 50 and moves one point for each percentage point the win rate differs from the model's expected win rate. Early scores can swing sharply until more games are recorded. It is not a pure measure of player skill.` : 'This number is based on a recent win–loss record and moves toward 50 when few games are recorded. It is not a model-based matchup skill estimate.'} Opponent skill, balance changes, and in-game choices affect results. {status}</p>
    </details>
  </section>;
}
