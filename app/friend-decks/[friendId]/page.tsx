import type { Metadata } from 'next';
import FriendDeckPageClient from './page-client';

export const metadata: Metadata = { title: 'Friend Deck and Counter', description: 'See a tracked friend’s recorded Clash Royale deck and a model suggested counter.', robots: { index: false, follow: false } };

export default function FriendDeckPage() { return <FriendDeckPageClient />; }
