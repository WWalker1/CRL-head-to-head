'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { MatchupSkillSummary } from '@/lib/matchup-skill';

export default function FriendSkillBadge({ friendId, friendName }: { friendId: string; friendName: string }) {
  const [skill, setSkill] = useState<MatchupSkillSummary | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [visible, setVisible] = useState(false);
  const badgeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!badgeRef.current || typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '150px' });
    observer.observe(badgeRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    fetch(`/api/friend-decks?friendId=${encodeURIComponent(friendId)}`, { credentials: 'same-origin', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('History unavailable');
        return response.json();
      })
      .then(payload => { if (!controller.signal.aborted) setSkill(payload.skill ?? null); })
      .catch(() => { if (!controller.signal.aborted) setUnavailable(true); });
    return () => controller.abort();
  }, [friendId, visible]);

  const score = skill?.score ?? skill?.recordScore ?? null;
  return <Link ref={badgeRef} href={`/friend-decks/${encodeURIComponent(friendId)}`} className="mt-4 flex min-h-11 items-center justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-violet-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-700" aria-label={`View ${friendName}'s matchup skill details`}>
    <span className="min-w-0 text-xs font-semibold">{skill?.score != null ? 'Matchup skill' : 'Recent record'} <span className="font-normal text-violet-700">· latest 100 games</span></span>
    <span className="shrink-0 text-xl font-black tabular-nums">{unavailable ? '—' : skill ? score === null ? '—' : Math.round(score) : '…'}<span className="text-xs font-medium">/100</span></span>
  </Link>;
}
