import Link from 'next/link';

export default function FriendInsights({ friendId, friendName }: { friendId: string; friendName: string }) {
  return (
    <Link
      href={`/friend-decks/${encodeURIComponent(friendId)}`}
      aria-label={`View ${friendName}'s most-played decks and counters`}
      className="mt-5 flex min-h-11 w-full items-center justify-between rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 px-4 py-3 text-sm font-semibold text-blue-800 dark:text-blue-200 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
    >
      <span>Most-played decks &amp; counters</span>
      <span aria-hidden="true" className="text-base">→</span>
    </Link>
  );
}
