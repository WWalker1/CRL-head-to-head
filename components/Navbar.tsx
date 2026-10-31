import Link from "next/link";
import MobileNav from "./MobileNav";
import ToolNavigation from "./ToolNavigation";
import { createClient } from "@/lib/supabase-server";

export default async function Navbar() {
  const configured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const user = configured
    ? (await (await createClient()).auth.getUser()).data.user
    : null;
  const links = (
    <>
      <ToolNavigation
        tools={process.env.MODEL_TOOLS_ENABLED === "1"}
        publicLookup={process.env.PUBLIC_PLAYER_LOOKUP_ENABLED === "1"}
      />
      <Link href="/guides" className="rr-nav-link">
        Guides
      </Link>
      {user ? (
        <Link href="/dashboard" className="rr-button rr-button-primary">
          Your rivalries
        </Link>
      ) : (
        <>
          <Link href="/login" className="rr-nav-link">
            Sign in
          </Link>
          <Link href="/signup" className="rr-button rr-button-primary">
            Start tracking
          </Link>
        </>
      )}
    </>
  );
  return (
    <nav aria-label="Main navigation" className="rr-navigation">
      <div className="rr-container flex min-h-20 items-center justify-between gap-4">
        <Link href="/" className="rr-wordmark" aria-label="Rival Royale home">
          <span className="rr-emblem" aria-hidden="true">
            R
          </span>
          <span>
            RIVAL
            <br />
            ROYALE
          </span>
        </Link>
        <div className="hidden items-center gap-7 md:flex">{links}</div>
        <MobileNav>{links}</MobileNav>
      </div>
    </nav>
  );
}
