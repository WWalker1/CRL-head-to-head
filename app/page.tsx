import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-orange-600">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            CRL Head-to-Head Tracker
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto">
            Track your win/loss records against your Clash Royale friends. 
            See who comes out on top in your battles!
          </p>
        </div>

        {/* How to Find Your Player Tag Section */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-12 max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            How to Find Your Player Tag
          </h2>
          <p className="text-gray-600 text-center mb-8">
            You'll need your Clash Royale player tag to get started. Here's how to find it:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="mb-4 relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300">
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-400 text-sm">Step 1 Image</p>
                </div>
                {/* Placeholder for step 1 image - will be replaced with actual image */}
                {/* <Image 
                  src="/images/find-tag-step1.png" 
                  alt="Step 1: Select player name"
                  fill
                  className="object-contain"
                /> */}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Select player name</h3>
              <p className="text-sm text-gray-600">
                Tap on your player name at the top of the game screen
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="mb-4 relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300">
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-400 text-sm">Step 2 Image</p>
                </div>
                {/* Placeholder for step 2 image - will be replaced with actual image */}
                {/* <Image 
                  src="/images/find-tag-step2.png" 
                  alt="Step 2: Select player tag"
                  fill
                  className="object-contain"
                /> */}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Select player tag</h3>
              <p className="text-sm text-gray-600">
                Your player tag will be displayed below your name (e.g., <span className="font-mono font-semibold text-blue-600">#COG20PR2</span>)
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="mb-4 relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300">
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-400 text-sm">Step 3 Image</p>
                </div>
                {/* Placeholder for step 3 image - will be replaced with actual image */}
                {/* <Image 
                  src="/images/find-tag-step3.png" 
                  alt="Step 3: Copy Tag"
                  fill
                  className="object-contain"
                /> */}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Copy Tag</h3>
              <p className="text-sm text-gray-600">
                Tap the "Copy Tag" button to copy your player tag to your clipboard
              </p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-semibold">Example Player Tag:</span>
            </p>
            <code className="text-lg font-mono font-semibold text-blue-600 bg-white px-4 py-2 rounded border border-blue-200">
              #COG20PR2
            </code>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-5xl mx-auto">
          <div className="bg-white bg-opacity-90 rounded-lg p-6 text-center shadow-lg">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Track Records</h3>
            <p className="text-gray-600 text-sm">
              Automatically track wins and losses against each friend with detailed statistics
            </p>
          </div>
          
          <div className="bg-white bg-opacity-90 rounded-lg p-6 text-center shadow-lg">
            <div className="text-4xl mb-4">🔄</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Auto Sync</h3>
            <p className="text-gray-600 text-sm">
              Battles are automatically synced from the Clash Royale API - no manual entry needed
            </p>
          </div>
          
          <div className="bg-white bg-opacity-90 rounded-lg p-6 text-center shadow-lg">
            <div className="text-4xl mb-4">🎮</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">1v1 Focus</h3>
            <p className="text-gray-600 text-sm">
              Only tracks head-to-head 1v1 battles, keeping your stats clean and accurate
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-orange-600 text-white text-xl font-bold rounded-lg hover:bg-orange-700 transition-colors shadow-xl hover:shadow-2xl transform hover:scale-105 transition-transform"
          >
            Get Started
          </Link>
          <p className="mt-4 text-blue-100">
            Already have an account?{' '}
            <Link href="/login" className="text-white font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
