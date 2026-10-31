"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { PublicPlayerSnapshot } from "@/lib/public-player-types";
import { scoreShareSvg, scoreShareText } from "@/lib/score-share";

export default function ScoreShare({
  snapshot,
}: {
  snapshot: PublicPlayerSnapshot;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const url = "https://rival-royale.com/clash-royale-skill-score";

  async function share() {
    setBusy(true);
    setMessage("");
    try {
      const text = scoreShareText(snapshot);
      if (navigator.share) {
        await navigator.share({
          title: "My recent Rival Royale snapshot",
          text,
          url,
        });
        setMessage("Share dialog completed.");
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setMessage("Result and tool link copied.");
      }
    } catch (reason) {
      if (!(reason instanceof Error && reason.name === "AbortError"))
        setMessage(
          "Sharing is unavailable in this browser. You can download the score card instead.",
        );
    } finally {
      setBusy(false);
    }
  }

  function download() {
    try {
      const blob = new Blob([scoreShareSvg(snapshot)], {
        type: "image/svg+xml;charset=utf-8",
      });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `rival-royale-${snapshot.playerTag.replace("#", "")}-${snapshot.fetchedAt.slice(0, 10)}.svg`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setMessage("Dated score card downloaded.");
    } catch {
      setMessage(
        "The card could not be downloaded in this browser. Try sharing the text instead.",
      );
    }
  }

  return (
    <section
      className="rounded-lg border border-stone-300 bg-[#efede5] p-4"
      aria-label="Share this snapshot"
    >
      <p className="font-bold text-stone-950">
        Bring a friend into the rivalry.
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Sharing includes this player tag, dated score, sample size and recent
        record. The link opens the lookup tool, not a saved copy of the result.
        Nothing is published automatically.
      </p>
      <dialog
        ref={dialog}
        aria-labelledby="score-preview-title"
        className="w-[min(94vw,900px)] max-h-[90dvh] overflow-auto rounded-lg border border-stone-300 bg-[#f7f5ef] p-5 text-stone-900 backdrop:bg-black/60"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="score-preview-title" className="text-xl font-bold">
            Your score card
          </h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="rr-button"
          >
            Close
          </button>
        </div>
        {preview && (
          <Image
            unoptimized
            src={preview}
            alt="Preview of the dated score card including player tag, record and supported sample"
            width={1200}
            height={630}
            className="h-auto w-full rounded-lg"
          />
        )}
        <p className="mt-4 text-sm text-stone-600">
          The download is an SVG image. The shared link opens the lookup tool.
        </p>
        <button
          type="button"
          onClick={download}
          className="rr-button rr-button-primary mt-4"
        >
          Download this card
        </button>
      </dialog>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            try {
              setPreview(
                `data:image/svg+xml;charset=utf-8,${encodeURIComponent(scoreShareSvg(snapshot))}`,
              );
              dialog.current?.showModal();
            } catch {
              setMessage("Preview unavailable. Try downloading the card.");
            }
          }}
          className="rr-button"
        >
          Preview card
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={share}
          className="min-h-11 rounded-lg bg-[#c24719] px-4 font-semibold text-white disabled:opacity-60"
        >
          Share result
        </button>
        <button
          type="button"
          onClick={download}
          className="min-h-11 rounded-lg border border-stone-300 px-4 font-semibold text-stone-800"
        >
          Download score card
        </button>
      </div>
      <p role="status" className="mt-2 text-sm text-stone-900">
        {message}
      </p>
    </section>
  );
}
