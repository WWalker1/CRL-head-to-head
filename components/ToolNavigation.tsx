"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ToolNavigation({
  tools,
  publicLookup,
}: {
  tools: boolean;
  publicLookup: boolean;
}) {
  const path = usePathname();
  const active = [
    "/tools",
    "/counter-deck",
    "/matchup",
    "/clash-royale-skill-score",
    "/compare-players",
  ].includes(path);
  return (
    <Link
      href="/tools"
      aria-current={active ? "page" : undefined}
      className="rr-nav-link"
    >
      {tools || publicLookup ? "Tools" : "Explore"}
    </Link>
  );
}
