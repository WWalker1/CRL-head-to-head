'use client';

import { useRef, useState } from 'react';
import FriendDeckExperience from './FriendDeckExperience';

export default function FriendInsights({ friendId, friendTag, friendName }: { friendId: string; friendTag: string; friendName: string }) {
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);
  return <div className="relative mt-4" onPointerEnter={event => { if (event.pointerType === 'mouse' && window.innerWidth >= 640 && !pinned.current) setOpen(true); }} onPointerLeave={event => { if (event.pointerType === 'mouse' && window.innerWidth >= 640 && !pinned.current) setOpen(false); }}>
    <button type="button" aria-expanded={open} aria-controls={`friend-deck-${friendId}`} onClick={() => { pinned.current = !pinned.current; setOpen(pinned.current); }} className="flex min-h-11 w-full items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-800 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
      <span>See deck and best counter</span><span aria-hidden="true">{open ? '−' : '+'}</span>
    </button>
    {open && <div id={`friend-deck-${friendId}`} className="relative z-30 mt-2 rounded-xl border border-blue-100 bg-white p-3 shadow-xl sm:absolute sm:left-0 sm:right-0 sm:top-full sm:mt-0 sm:max-h-[min(75vh,720px)] sm:overflow-y-auto"><button type="button" onClick={() => { pinned.current = false; setOpen(false); }} className="float-right flex h-11 w-11 items-center justify-center rounded-lg text-xl text-gray-500" aria-label="Close deck preview">×</button><FriendDeckExperience friendId={friendId} friendTag={friendTag} friendName={friendName} compact /></div>}
  </div>;
}
