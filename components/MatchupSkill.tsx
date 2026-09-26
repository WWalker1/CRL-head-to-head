import type { MatchupSkillSummary } from '@/lib/matchup-skill';

export default function MatchupSkill({ skill, status }: { skill: MatchupSkillSummary; status?: string }) {
  return <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-gray-900" aria-label="Matchup skill score">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-blue-900">Matchup skill <span className="text-xs font-normal">Beta</span></h3><span className="text-2xl font-bold">{skill.score === null ? '—' : `${skill.score}/100`}</span></div>
    {skill.score === null ? <p className="mt-2 text-sm">Not enough supported match estimates yet. Sync battles to start collecting history.</p> : <>
      <p className="mt-2 text-sm">{skill.actualWins} wins vs {skill.expectedWins.toFixed(1)} expected · {skill.winsAboveExpected >= 0 ? '+' : ''}{skill.winsAboveExpected.toFixed(1)} wins above expectation</p>
      <p className="mt-1 text-sm">Tough matchups: {skill.toughWins} wins in {skill.toughMatches} games (model chance below 40%).</p>
      <p className="mt-2 text-xs">{skill.scoredMatches} of {skill.eligibleMatches} recent decisive Ranked matches scored{skill.provisional ? ' · Provisional until 30 scored games' : ''}. 50 is neutral; small samples stay closer to 50.</p>
    </>}
    <p className="mt-2 text-xs text-gray-600">Performance relative to a deck model, not a pure measure of player skill. Opponent skill and balance changes can affect this score. {status}</p>
  </section>;
}
