import type { Metadata } from 'next';
import FriendSkillPageClient from './page-client';

export const metadata: Metadata = {
  title: 'Friend Matchup Skill',
  description: 'Review a tracked friend’s recent Clash Royale skill score and battle highlights.',
  robots: { index: false, follow: false },
};

export default function FriendSkillPage() {
  return <FriendSkillPageClient />;
}
