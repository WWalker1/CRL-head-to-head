import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="bg-blue-900/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link 
            href="/" 
            className="text-xl md:text-2xl font-bold text-white hover:text-orange-200 transition-colors"
          >
            🏆 CRL Tracker
          </Link>
          
          <div className="flex items-center gap-4 md:gap-6">
            <Link 
              href="/info" 
              className="text-white hover:text-orange-200 transition-colors text-sm md:text-base font-medium"
            >
              How It Works
            </Link>
            {user ? (
              <Link 
                href="/dashboard" 
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm md:text-base font-medium"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="text-white hover:text-orange-200 transition-colors text-sm md:text-base font-medium"
                >
                  Login
                </Link>
                <Link 
                  href="/signup" 
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm md:text-base font-medium"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}


