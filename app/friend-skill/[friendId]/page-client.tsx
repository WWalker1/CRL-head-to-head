'use client';

import { useParams } from 'next/navigation';
import PlayerStatsView from '@/components/PlayerStatsView';

export default function FriendSkillPageClient() {
  const { friendId } = useParams<{ friendId: string }>();
  return <main className="min-h-[calc(100vh-73px)] bg-[#0d1024] px-4 py-8 text-slate-100 sm:px-6 sm:py-12 lg:px-8">
    <div className="mx-auto max-w-5xl"><PlayerStatsView friendId={friendId} /></div>
  </main>;
}
