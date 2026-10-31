import Link from "next/link";

export default function FriendInsights({
  friendId,
  friendName,
}: {
  friendId: string;
  friendName: string;
}) {
  return (
    <Link
      href={`/friend-decks/${encodeURIComponent(friendId)}`}
      aria-label={`View ${friendName}'s matchup advantage, decks and counters`}
      className="mt-5 flex min-h-11 w-full items-center justify-between rounded-lg border border-stone-200 bg-[#f7f5ef] px-4 py-3 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
    >
      <span>Matchup advantage &amp; rematch</span>
      <span aria-hidden="true" className="text-base">
        →
      </span>
    </Link>
  );
}
