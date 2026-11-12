'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export default function MobileNav({ children }: { children: ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  useEffect(() => { if (menu.current) menu.current.open = false; }, [pathname]);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target) && menu.current) menu.current.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);
  return <details ref={menu} className="relative md:hidden group">
    <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-white/40 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 [&::-webkit-details-marker]:hidden" aria-label="Open navigation menu">
      <span aria-hidden="true" className="text-xl leading-none">☰</span>
    </summary>
    <div onClick={event => { if ((event.target as Element).closest('a') && menu.current) menu.current.open = false; }} className="absolute right-0 top-full mt-2 flex min-w-44 flex-col gap-3 rounded-lg border border-white/20 bg-blue-900 p-4 shadow-xl">
      {children}
    </div>
  </details>;
}
