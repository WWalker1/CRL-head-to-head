import { TrackedFriend } from '@/lib/types';

interface FriendCardProps {
  friend: TrackedFriend;
  onRemove: (id: string) => void;
}

export default function FriendCard({ friend, onRemove }: FriendCardProps) {
  const totalGames = friend.total_wins + friend.total_losses;
  const winPercentage = totalGames > 0 
    ? Math.round((friend.total_wins / totalGames) * 100) 
    : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{friend.friend_name}</h3>
          <p className="text-sm text-gray-500">{friend.friend_player_tag}</p>
          
          <div className="mt-4">
            <div className="flex items-baseline gap-4">
              <div>
                <span className="text-3xl font-bold text-blue-600">{friend.total_wins}</span>
                <span className="text-gray-400"> - </span>
                <span className="text-3xl font-bold text-orange-600">{friend.total_losses}</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{winPercentage}%</p>
                <p className="text-xs text-gray-500">Win Rate</p>
              </div>
            </div>
            
            {/* Win percentage bar */}
            <div className="mt-4 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                style={{ width: `${winPercentage}%` }}
              />
            </div>
          </div>
        </div>
        
        <button
          onClick={() => onRemove(friend.id)}
          className="ml-4 text-gray-400 hover:text-red-600 transition-colors"
          aria-label="Remove friend"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

