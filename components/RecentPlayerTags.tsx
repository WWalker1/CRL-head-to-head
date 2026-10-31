"use client";
import { useSyncExternalStore } from "react";
import {
  clearRecentTags,
  parseRecentTags,
  recentTagsSnapshot,
  subscribeRecentTags,
} from "@/lib/recent-player-tags";

export default function RecentPlayerTags({
  onSelect,
  disabled = false,
}: {
  onSelect: (tag: string) => void;
  disabled?: boolean;
}) {
  const raw = useSyncExternalStore(
    subscribeRecentTags,
    recentTagsSnapshot,
    () => "[]",
  );
  const tags = parseRecentTags(raw);
  if (!tags.length) return null;
  return (
    <div
      className="ph-no-capture mt-3 flex flex-wrap items-center gap-2"
      aria-label="Recent player searches"
    >
      <span className="text-xs text-stone-500">On this device</span>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(tag)}
          className="rr-button !min-h-9 !px-2 !py-1 !text-xs"
        >
          {tag}
        </button>
      ))}
      <button
        type="button"
        onClick={clearRecentTags}
        className="min-h-9 px-2 text-xs text-stone-600 underline"
      >
        Clear recent tags
      </button>
    </div>
  );
}
