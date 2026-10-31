'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import FriendDeckPageExperience from '@/components/FriendDeckPageExperience';

export default function FriendDeckPageClient() {
  const params = useParams<{ friendId: string }>();
  return <main className="min-h-screen bg-[#f7f5ef] px-4 py-6 sm:py-10"><div className="mx-auto max-w-4xl"><Link href="/dashboard" className="inline-flex min-h-11 items-center font-semibold text-stone-700 underline">← Back to friends</Link><div className="mt-3 rounded-lg bg-[#fffdf8] p-4 border border-stone-200 sm:p-7"><FriendDeckPageExperience friendId={params.friendId} /></div></div></main>;
}
