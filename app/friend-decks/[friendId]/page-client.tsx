'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import FriendDeckExperience from '@/components/FriendDeckExperience';

export default function FriendDeckPageClient() {
  const params = useParams<{ friendId: string }>();
  return <main className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-orange-600 px-4 py-6 sm:py-10"><div className="mx-auto max-w-2xl"><Link href="/dashboard" className="inline-flex min-h-11 items-center font-semibold text-white underline">← Back to friends</Link><div className="mt-3 rounded-2xl bg-white p-4 shadow-xl sm:p-7"><FriendDeckExperience friendId={params.friendId} /></div></div></main>;
}
