import type { Metadata } from 'next';
import Link from 'next/link';
import ArticlePage from '@/components/ArticlePage';

export const metadata: Metadata = {
  title: 'How to Read Your Clash Royale Skill Score',
  description: 'A worked example of Rival Royale’s matchup skill score: expected wins, difficult wins, favored losses, small samples, and what to review after a game.',
  alternates: { canonical: '/guides/understand-skill-score' },
};

const games = [
  ['Game 1', '20%', 'Win', '+0.8'],
  ['Game 2', '70%', 'Loss', '−0.7'],
  ['Game 3', '40%', 'Win', '+0.6'],
  ['Game 4', '70%', 'Win', '+0.3'],
];

export default function SkillGuidePage() {
  return <ArticlePage title="How to read your Clash Royale skill score" intro="Your record says how often you won. Rival Royale’s matchup skill score asks a narrower question: did your recorded results beat the expectations of the deck model?">
    <section><h2>Start with three different numbers</h2><p>A head-to-head record covers the games captured against a particular tracked friend. A recent win rate counts wins among your recorded decisive games. Matchup skill uses only the supported games that have estimates from the selected model version. These are different samples, so the numbers do not have to move together.</p><p>The score is useful for finding games to review. It cannot separate your decisions from your opponent’s decisions, and a deck estimate can be wrong. Treat it as context for practice, rather than a ranking of every player in Clash Royale.</p></section>
    <section><h2>A four-game example</h2><p>Suppose the model gives your deck the following chances in four supported games. These are invented numbers for explaining the calculation, not recorded results or live deck recommendations.</p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-violet-100"><table className="w-full min-w-[360px] text-left text-sm"><caption className="sr-only">Illustrative supported games and their contribution above model expectation</caption><thead className="bg-violet-50"><tr>{['Game', 'Model chance', 'Result', 'Wins above expected'].map(label => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{games.map(row => <tr key={row[0]} className="border-t border-violet-100">{row.map((cell, index) => <td key={index} className="px-3 py-3">{cell}</td>)}</tr>)}</tbody></table></div>
      <p>The model expected 0.2 + 0.7 + 0.4 + 0.7 = <strong>2 wins</strong>. You won <strong>3 games</strong>, so you finished <strong>1 win above expectation</strong>. The current score is 50 + 100 × (wins above expectation ÷ supported games), bounded to 0–100. For this example, that is 50 + 100 × (1 ÷ 4) = <strong>75</strong>.</p><p>Notice the first game contributes +0.8: a win counts as 1, minus the model’s 0.2 expectation. Losing the second game contributes −0.7. This is why a tough win can move the score more than an expected win.</p>
    </section>
    <section><h2>A 75 score is not a 75% future win rate</h2><p>In the example, the win rate happens to be 75% too. That is a coincidence caused by the average model expectation being 50%. If you win three of four games when the model expects three wins, the score is 50, while the recorded win rate is still 75%.</p><p>A score of 50 means your outcomes matched the model’s expectations for those games. A higher score means you exceeded those expectations in the recorded window. It does not prove that you are better than a player with a lower score facing different opponents.</p></section>
    <section><h2>Why the sample matters</h2><p>The player view uses the latest 50 recorded constructed 1v1 games; only supported, eligible decisive matches contribute model estimates. Duplicate views of the same match are counted once. Estimates from different model versions are not mixed, and games without a usable estimate do not become 50/50 guesses.</p><p>Below 30 supported games, the model score is marked provisional. In the four-game example, changing one loss into a win changes the score by 25 points. That is a large movement from one outcome, not evidence that your underlying ability suddenly changed.</p><p>If there are no supported estimates, the app can show a recent record score instead. That fallback is based on wins and losses with smoothing and should not be read as a matchup-adjusted score.</p></section>
    <section><h2>Turn a highlight into a practice question</h2><ol><li><strong>Check the inputs.</strong> Were both eight-card decks, forms, levels, and tower troops captured correctly? An input error can explain a surprising estimate.</li><li><strong>Review the rotation.</strong> In a tough win, what let you reach your win condition while their answer was unavailable? In a favored loss, did you spend your reliable defensive answer before their pressure?</li><li><strong>Separate one game from a pattern.</strong> Repeat losses to the same game plan are more actionable than one opening-hand disadvantage.</li><li><strong>Change one thing.</strong> Test a different defensive sequence or a single card swap, then compare another recorded set. Multiple simultaneous changes make it harder to identify what helped.</li></ol></section>
    <section><h2>Compare with a friend carefully</h2><p>Use the head-to-head record to discuss your captured games together, and the score to find review candidates. Check the supported-game counts before comparing scores. A handful of supported matches and a full recent window carry different amounts of evidence, even when the headline number is identical.</p><p>Ready to try it? <Link href="/clash-royale-skill-score">See how to get your skill score</Link>, read the <Link href="/models">model methodology</Link>, or <Link href="/clash-royale-counter-deck-finder">build a plan for a friend’s deck</Link>.</p></section>
  </ArticlePage>;
}
