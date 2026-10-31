"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Keep auth-aware links server-rendered while handling mobile disclosure behavior. */
export default function MobileNav({ children }: { children: ReactNode }) {
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (details.current) details.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (details.current && !details.current.contains(event.target as Node)) {
        details.current.open = false;
      }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  return (
    <details
      ref={details}
      className="relative md:hidden"
      onKeyDown={(event) => {
        if (event.key === "Escape" && details.current?.open) {
          details.current.open = false;
          summary.current?.focus();
        }
      }}
    >
      <summary
        ref={summary}
        className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-stone-300 text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 [&::-webkit-details-marker]:hidden"
        aria-label="Navigation menu"
      >
        <span aria-hidden="true" className="text-xl leading-none">
          ☰
        </span>
      </summary>
      <div
        className="absolute right-0 top-full mt-2 flex min-w-44 flex-col gap-3 rounded-lg border border-stone-300 bg-[#fffdf8] p-4 shadow-xl"
        onClick={(event) => {
          // Also close when the current route is selected again.
          if ((event.target as Element).closest("a[href]") && details.current)
            details.current.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}
