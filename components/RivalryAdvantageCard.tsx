import type { RivalryAdvantage } from "@/lib/rivalry-advantage";

export default function RivalryAdvantageCard({
  value,
  friendName,
}: {
  value: RivalryAdvantage;
  friendName: string;
}) {
  const names = {
    you: "You",
    friend: friendName,
    even: "Neither side",
    unavailable: "Not enough data",
  };
  const verdict =
    value.performanceEdge === "insufficient"
      ? "Building the matchup picture"
      : value.performanceEdge === "even"
        ? "Close after accounting for decks"
        : `${value.performanceEdge === "you" ? "You have" : `${friendName} has`} the adjusted edge`;
  return (
    <section
      className="rr-panel overflow-hidden"
      aria-label="Head-to-head matchup advantage"
    >
      <div className="border-b border-stone-200 px-5 py-4 sm:px-6">
        <p className="rr-kicker">You vs {friendName}</p>
        <h2 className="mt-2 text-xl font-bold">The record. With context.</h2>
      </div>
      <div className="grid gap-6 p-5 sm:grid-cols-[.8fr_1.2fr] sm:p-6">
        <div>
          <p className="text-sm text-stone-600">
            Retained head-to-head matches
          </p>
          <p className="rr-score mt-3 text-5xl font-bold">
            <span>{value.wins}</span>
            <span className="px-3 text-stone-400">:</span>
            <span>{value.losses}</span>
          </p>
          <p className="mt-2 text-sm text-stone-600">
            Your wins / their wins{value.draws ? ` / ${value.draws} draws` : ""}
          </p>
        </div>
        <div>
          <p className="rr-kicker">
            Matchup-adjusted performance
            {value.provisional ? " · provisional" : ""}
          </p>
          <h3 className="mt-2 text-lg font-bold">{verdict}</h3>
          {value.scoredMatches ? (
            <>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                You won{" "}
                <strong className="text-stone-900">{value.actualWins}</strong>{" "}
                of {value.scoredMatches} scored matches. Your decks were
                expected to win{" "}
                <strong className="text-stone-900">
                  {value.expectedWins.toFixed(1)}
                </strong>
                . That is {Math.abs(value.winsAboveExpected).toFixed(1)}{" "}
                {value.winsAboveExpected >= 0 ? "above" : "below"} expectation.
              </p>
              <p className="mt-2 text-sm">
                <span className="text-stone-600">Deck advantage: </span>
                <strong>
                  {names[value.deckAdvantage as keyof typeof names]}
                </strong>
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {value.ownerKnown
                ? "No supported matchup estimates for your direct games yet. Refresh history after playing each other."
                : "Link your player tag to identify your direct games."}
            </p>
          )}
        </div>
      </div>
      <details className="border-t border-stone-200 px-5 py-4 text-sm sm:px-6">
        <summary className="cursor-pointer font-semibold">
          How to read the edge
        </summary>
        <div className="mt-3 max-w-3xl space-y-2 leading-6 text-stone-600">
          <p>
            Winning four of ten games can be strong performance if your decks
            were expected to win only two. The adjustment sums the model’s
            matchup chances across the same scored games and subtracts that
            expectation from your wins.
          </p>
          <p>
            An edge needs at least ten scored matches and a gap of five
            percentage points. These are display thresholds, not a statistical
            significance test or proof of who is the better player. Small
            samples, level gaps and model error can change the result.
          </p>
          <p>
            Only your direct games in retained history count here. This can
            differ from the accumulated dashboard record.
            {value.retentionLimitReached
              ? " The 100-record retention limit may exclude older head-to-head games."
              : ""}{" "}
            Draws and unsupported estimates are excluded from the adjustment.
          </p>
        </div>
      </details>
    </section>
  );
}
