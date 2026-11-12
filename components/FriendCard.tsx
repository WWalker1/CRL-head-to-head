import { TrackedFriend } from '@/lib/types';
import EloDisplay from './EloDisplay';
import FriendInsights from './FriendInsights';
import FriendSkillBadge from './FriendSkillBadge';

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
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{friend.friend_name}</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">{friend.friend_player_tag}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-slate-400">Elo:</span>
            <EloDisplay elo={friend.elo_rating ?? 1500} size="md" />
          </div>
          
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2 whitespace-nowrap text-3xl font-bold leading-none tabular-nums" role="img" aria-label={`${friend.total_wins} ${friend.total_wins === 1 ? 'win' : 'wins'} and ${friend.total_losses} ${friend.total_losses === 1 ? 'loss' : 'losses'}`}>
                <span className="text-blue-600 dark:text-blue-400">{friend.total_wins}</span>
                <span className="text-xl font-medium text-gray-600 dark:text-slate-300" aria-hidden="true">–</span>
                <span className="text-orange-600 dark:text-orange-400">{friend.total_losses}</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{winPercentage}%</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Win Rate</p>
              </div>
            </div>
            
            {/* Win percentage bar */}
            <div className="mt-4 h-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                style={{ width: `${winPercentage}%` }}
              />
            </div>
          </div>
        </div>
        
        <button
          onClick={() => onRemove(friend.id)}
          className="ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 transition-colors"
          aria-label="Remove friend"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {process.env.NEXT_PUBLIC_MODEL_TOOLS_ENABLED === '1' && <><FriendSkillBadge friendId={friend.id} friendName={friend.friend_name} /><FriendInsights friendId={friend.id} friendName={friend.friend_name} /></>}
    </div>
  );
}

