'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { TrackedFriend } from '@/lib/types';
import FriendCard from '@/components/FriendCard';
import AddFriendModal from '@/components/AddFriendModal';
import SyncButton from '@/components/SyncButton';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<TrackedFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userTag, setUserTag] = useState('');
  const [userElo, setUserElo] = useState(1500);

  useEffect(() => {
    fetchFriends();
    fetchUserTag();
  }, []);

  const fetchFriends = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('tracked_friends')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching friends:', error);
      } else {
        setFriends(data || []);
      }

      const { data: ratingData, error: ratingError } = await supabase
        .from('user_ratings')
        .select('elo_rating')
        .eq('user_id', user.id)
        .single();

      if (ratingError) {
        if (ratingError.code === 'PGRST116') {
          setUserElo(1500);
        } else {
          console.error('Error fetching user rating:', ratingError);
        }
      } else {
        setUserElo(ratingData?.elo_rating ?? 1500);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTag = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const tag = user.user_metadata?.player_tag || 'Unknown';
        setUserTag(tag);
      }
    } catch (error) {
      console.error('Error fetching user tag:', error);
    }
  };

  const handleSync = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return;

    const response = await fetch('/api/sync-battles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync battles');
    }

    const result = await response.json();
    
    // Refresh friends list after sync
    await fetchFriends();
    
    return result;
  };

  const handleAddFriend = async (tag: string) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) throw new Error('Not authenticated');

    const response = await fetch('/api/add-friend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ friendTag: tag }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add friend');
    }

    await fetchFriends();
  };

  const handleRemoveFriend = async (id: string) => {
    if (!confirm('Are you sure you want to remove this friend from tracking?')) {
      return;
    }

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/remove-friend', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ friendId: id }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove friend');
      }

      await fetchFriends();
      toast.success('Friend removed successfully');
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('Failed to remove friend');
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-orange-600 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-orange-600">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">CRL Tracker</h1>
            <p className="text-blue-100 mt-1">Tag: {userTag}</p>
            <p className="text-blue-100 mt-1">Elo: {userElo}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Sync Button */}
        <div className="mb-8">
          <SyncButton onSync={handleSync} />
        </div>

        {/* Friends List */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Your Friends</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors shadow-lg"
            >
              + Add Friend
            </button>
          </div>

          {friends.length === 0 ? (
            <div className="bg-white bg-opacity-10 rounded-lg p-8 text-center text-white">
              <p className="text-lg">No friends tracked yet.</p>
              <p className="text-sm mt-2">Add a friend to start tracking your head-to-head record!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map((friend) => (
                <FriendCard key={friend.id} friend={friend} onRemove={handleRemoveFriend} />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddFriendModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddFriend}
      />
    </div>
  );
}

