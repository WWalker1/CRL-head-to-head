"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { PublicPlayerSnapshot } from "@/lib/public-player-types";
import { capturePublicLookup } from "@/lib/public-lookup-analytics";
import ScoreShare from "./ScoreShare";
import RecentPlayerTags from "./RecentPlayerTags";
import { rememberPlayerTag } from "@/lib/recent-player-tags";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function PublicPlayerLookup() {
  const [tag, setTag] = useState("");
  const [data, setData] = useState<PublicPlayerSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [],
  );

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setData(null);
    setError("");
    capturePublicLookup({ name: "public_lookup_started" });
    let timedOut = false;
    let failureReason:
      "rate_limited" | "invalid_tag" | "not_found" | "unavailable" | "timeout" =
      "unavailable";
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 25000);
    try {
      const response = await fetch("/api/public-player", {
        method: "POST",
        credentials: "omit",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerTag: tag }),
      });
      const payload = await response.json();
      if (!response.ok) {
        failureReason =
          response.status === 429
            ? "rate_limited"
            : response.status === 400
              ? "invalid_tag"
              : response.status === 404
                ? "not_found"
                : "unavailable";
        if (response.status === 429)
          throw new Error(
            "Lookup limit reached. Please wait before trying again; shared networks can share a limit.",
          );
        throw new Error(
          response.status === 404
            ? "Player not found. Check the tag in your game profile."
            : response.status === 400
              ? "Enter the player tag from your game profile, including only tag characters."
              : "Recent battles are unavailable. Please try again later.",
        );
      }
      if (!controller.signal.aborted) {
        setData(payload as PublicPlayerSnapshot);
        rememberPlayerTag(payload.playerTag);
        capturePublicLookup({
          name: "public_lookup_completed",
          eligibleGames: payload.eligibleGames,
          scoredGames: payload.scoredGames,
          status: payload.status,
        });
      }
    } catch (reason) {
      if (!controller.signal.aborted || timedOut)
        capturePublicLookup({
          name: "public_lookup_failed",
          reason: timedOut ? "timeout" : failureReason,
        });
      if (active.current === controller && timedOut)
        setError("This lookup took too long. Please try again shortly.");
      else if (!controller.signal.aborted)
        setError(
          reason instanceof Error
            ? reason.message
            : "Lookup unavailable. Try again later.",
        );
    } finally {
      clearTimeout(timeout);
      if (active.current === controller) setLoading(false);
    }
  }

  return (
    <section
      id="player-lookup"
      aria-labelledby="lookup-heading"
      className="mt-10 scroll-mt-24 rounded-lg border border-stone-300 bg-white p-5  sm:p-8"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-[#a73b13]">
        Free recent snapshot
      </p>
      <h2 id="lookup-heading" className="mt-2 text-2xl font-bold sm:text-3xl">
        Check a player. No signup needed.
      </h2>
      <p id="lookup-help" className="mt-3 max-w-2xl leading-7 text-slate-600">
        Copy the player tag below your name in your Clash Royale profile. We
        analyze up to 25 recent eligible 1v1 games available from the public
        game API. This does not start ongoing tracking.
      </p>
      <form
        onSubmit={lookup}
        className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="block flex-1 font-semibold text-slate-800">
          Player tag
          <input
            value={tag}
            disabled={loading}
            onChange={(event) => {
              setTag(event.target.value);
              setData(null);
              setError("");
            }}
            placeholder="#2PP"
            required
            maxLength={16}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-describedby="lookup-help"
            className="ph-no-capture mt-2 block min-h-12 w-full rounded-xl border border-slate-300 px-4 text-base uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-700"
          />
        </label>
        <button
          disabled={loading}
          className="min-h-12 rounded-xl bg-[#c24719] px-6 font-bold text-white hover:bg-[#a73b13] disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? "Checking recent games…" : "Check recent performance"}
        </button>
      </form>
      <RecentPlayerTags
        disabled={loading}
        onSelect={(value) => {
          setTag(value);
          setData(null);
          setError("");
        }}
      />
      <div aria-live="polite" aria-busy={loading} className="mt-4">
        {loading ? (
          <p className="text-sm text-slate-600">
            Fetching available battles and comparing supported decks…
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-orange-50 p-4 text-orange-900"
          >
            {error}
          </p>
        ) : null}
        {data ? (
          <article className="space-y-5 border-t border-stone-200 pt-5">
            <header>
              <h3 className="break-all text-xl font-bold">
                Recent performance: {data.playerTag}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Snapshot fetched {dateLabel(data.fetchedAt)}. Results may be
                reused for up to five minutes.
              </p>
            </header>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-[#efede5] p-4">
                <p className="font-semibold text-stone-900">Matchup skill</p>
                <p className="mt-2 text-4xl font-bold">
                  {data.score === null ? "Unavailable" : `${data.score}/100`}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {data.scoredGames} model-supported games
                  {data.provisional && data.scoredGames > 0
                    ? " · provisional sample"
                    : ""}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="font-semibold">Recent eligible record</p>
                <p className="mt-2 text-3xl font-bold">
                  {data.wins}W · {data.losses}L
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {data.eligibleGames} eligible decisive games from{" "}
                  {data.availableGames} available records
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 p-4">
                <p className="font-semibold">Wins above expectation</p>
                <p className="mt-2 text-3xl font-bold">
                  {data.score === null
                    ? "—"
                    : data.winsAboveExpected.toFixed(1)}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {data.score === null
                    ? "Requires supported matchup estimates"
                    : `${data.expectedWins.toFixed(1)} expected wins in scored games`}
                </p>
              </div>
            </div>
            {data.status === "model_unavailable" ? (
              <p className="rounded-xl bg-orange-50 p-4 text-sm leading-6 text-orange-900">
                Deck estimates are temporarily unavailable. This is a recent
                record only; we have not substituted a win percentage for a
                skill score.
              </p>
            ) : null}
            {data.status === "no_supported_games" ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                No model-supported games in this snapshot. Draft, modified
                decks, draws, unsupported cards and games before the training
                cutoff cannot receive a matchup skill score. Play supported
                constructed 1v1 games and check again later.
              </p>
            ) : null}
            {data.firstMatch && data.lastMatch ? (
              <p className="text-sm text-slate-600">
                Eligible window: {dateLabel(data.firstMatch)} to{" "}
                {dateLabel(data.lastMatch)}. Older games may be missing from the
                API.
              </p>
            ) : null}
            {data.highlights.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.highlights.map((row) => (
                  <section
                    key={`${row.date}-${row.result}`}
                    className="rounded-lg border border-stone-200 p-4"
                  >
                    <h4 className="font-bold">
                      {row.result === "win"
                        ? "Toughest modeled win"
                        : "Most favored modeled loss"}
                    </h4>
                    <p className="mt-2 text-sm">
                      {Math.round(row.expectedWinProbability * 100)}% estimated
                      chance · {dateLabel(row.date)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Deck:{" "}
                      {row.cards
                        .map(
                          (card) =>
                            `${card.name || card.id}${card.form === "1" ? " (Evolution)" : card.form === "2" ? " (Hero)" : ""}`,
                        )
                        .join(", ")}
                    </p>
                  </section>
                ))}
              </div>
            ) : null}
            <p className="text-sm leading-6 text-slate-600">
              This compares results with deck expectations. It does not isolate
              player decisions, account ownership or opponent skill, and is not
              a global percentile. Small samples can change quickly.
            </p>
            <details className="rr-panel p-4">
              <summary className="cursor-pointer font-semibold">
                Explain this result
              </summary>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                {data.score === null
                  ? "There are no supported matchup estimates to explain yet."
                  : `Across ${data.scoredGames} supported games, the model expected ${data.expectedWins.toFixed(1)} wins. Your results were ${Math.abs(data.winsAboveExpected).toFixed(1)} wins ${data.winsAboveExpected >= 0 ? "above" : "below"} that expectation. The score starts at 50 and adds your difference in win percentage points, bounded to 0–100.`}{" "}
                Only scored games enter this calculation, so the eligible record
                can contain more matches.
              </p>
            </details>
            <ScoreShare key={data.fetchedAt + data.playerTag} snapshot={data} />
            <Link
              href="/compare-players"
              className="inline-flex min-h-11 items-center font-semibold text-[#a73b13] underline"
            >
              Compare with a friend
            </Link>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link
                href="/guides/matchup-skill"
                className="inline-flex min-h-11 items-center font-semibold text-[#a73b13] underline underline-offset-4"
              >
                Understand this score
              </Link>
              <Link
                href="/signup"
                className="inline-flex min-h-11 items-center font-semibold text-[#a73b13] underline underline-offset-4"
              >
                Save an ongoing rivalry
              </Link>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
