import Link from 'next/link';
import MobileNav from './MobileNav';
import { createClient } from '@/lib/supabase-server';

export default async function Navbar() {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const user = configured ? (await (await createClient()).auth.getUser()).data.user : null;
  const showDeckTools = process.env.MODEL_TOOLS_ENABLED === '1';

  const links = (
    <>
      {showDeckTools && <Link href="/counter-deck" className="inline-flex min-h-11 items-center text-white hover:text-orange-200 text-sm font-medium">Counter finder</Link>}
      {showDeckTools && <Link href={user ? '/stats' : '/clash-royale-skill-score'} className="inline-flex min-h-11 items-center text-white hover:text-orange-200 text-sm font-medium">Skill score</Link>}
      <Link href="/info" className="inline-flex min-h-11 items-center text-white hover:text-orange-200 text-sm font-medium">How It Works</Link>
      {user ? (
        <>
          <Link href="/dashboard" className="inline-flex min-h-11 items-center bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm font-medium">Dashboard</Link>
        </>
      ) : (
        <>
          <Link href="/login" className="inline-flex min-h-11 items-center text-white hover:text-orange-200 text-sm font-medium">Login</Link>
          <Link href="/signup" className="inline-flex min-h-11 items-center bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm font-medium">Sign Up</Link>
        </>
      )}
    </>
  );

  return (
    <nav className="bg-blue-900/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between gap-3">
          <Link 
            href="/" 
            className="text-lg md:text-2xl font-bold text-white hover:text-orange-200 transition-colors whitespace-nowrap"
          >
            🏆 CRL Tracker
          </Link>
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            {links}
          </div>
          <MobileNav>{links}</MobileNav>
        </div>
      </div>
    </nav>
  );
}


