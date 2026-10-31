import { TrackedFriend } from "@/lib/types";
import EloDisplay from "./EloDisplay";
import FriendInsights from "./FriendInsights";

interface FriendCardProps {
  friend: TrackedFriend;
  onRemove: (id: string) => void;
}

export default function FriendCard({ friend, onRemove }: FriendCardProps) {
  const totalGames = friend.total_wins + friend.total_losses;
  const winPercentage =
    totalGames > 0 ? Math.round((friend.total_wins / totalGames) * 100) : 0;

  return (
    <div className="rr-panel p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {friend.friend_name}
          </h3>
          <p className="text-sm text-gray-500">{friend.friend_player_tag}</p>
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-stone-500">Rating</summary>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-gray-500">Elo:</span>
              <EloDisplay elo={friend.elo_rating ?? 1500} size="md" />
            </div>
          </details>

          <div className="mt-4">
            <p className="rr-kicker mb-2">You / {friend.friend_name}</p>
            <div className="flex items-baseline gap-4">
              <div>
                <span className="rr-score text-4xl font-bold text-stone-900">
                  {friend.total_wins}
                </span>
                <span className="text-gray-400"> - </span>
                <span className="rr-score text-4xl font-bold text-stone-900">
                  {friend.total_losses}
                </span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {winPercentage}%
                </p>
                <p className="text-xs text-gray-500">Your win rate</p>
              </div>
            </div>

            {/* Win percentage bar */}
            <div className="mt-4 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#c24719] transition-all duration-300"
                style={{ width: `${winPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => onRemove(friend.id)}
          className="ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          aria-label={`Remove ${friend.friend_name} from tracking`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      {process.env.NEXT_PUBLIC_MODEL_TOOLS_ENABLED === "1" && (
        <>
          <FriendInsights
            friendId={friend.id}
            friendName={friend.friend_name}
          />
        </>
      )}
    </div>
  );
}
