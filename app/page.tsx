import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import Image from 'next/image';
import AnimatedSection from '@/components/AnimatedSection';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen animated-gradient relative overflow-hidden">
      {/* Decorative floating elements - hidden on mobile */}
      <div className="hidden md:block absolute top-20 left-10 text-6xl floating">🏆</div>
      <div className="hidden md:block absolute top-20 right-20 text-5xl floating">⚔️</div>
      <div className="hidden md:block absolute bottom-20 left-20 text-5xl floating">🎮</div>
      <div className="hidden md:block absolute bottom-20 right-10 text-6xl floating">👑</div>

      <div className="container mx-auto px-4 py-6 md:py-12 relative z-10">
        {/* Hero Section */}
        <AnimatedSection>
          <div className="text-center mb-8 md:mb-16">
            <div className="inline-block bg-black/30 backdrop-blur-sm rounded-2xl px-6 py-4 md:px-10 md:py-6">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-4 drop-shadow-lg">
                CRL Head-to-Head Tracker
              </h1>
              <p className="text-base md:text-xl lg:text-2xl text-blue-100 max-w-2xl mx-auto px-2">
                Track your win/loss records against your Clash Royale friends. 
                See who comes out on top in your battles! 🏆
              </p>
            </div>
          </div>
        </AnimatedSection>

        {/* App Preview Section - smaller on mobile */}
        <AnimatedSection delay={200}>
          <div className="mb-8 md:mb-16 max-w-6xl mx-auto">
            <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl p-4 md:p-6 lg:p-8 overflow-hidden">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4 text-center">
                See Your Stats Come to Life
              </h2>
              <div className="relative w-full aspect-[1888/520] bg-gradient-to-br from-blue-50 to-orange-50 rounded-lg overflow-hidden border-2 border-gray-200">
                <Image 
                  src="/images/dashboard-screenshot.png" 
                  alt="CRL Tracker Dashboard Preview"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Features Section - compact on mobile */}
        <AnimatedSection delay={400}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-16 max-w-5xl mx-auto">
            <div className="bg-white bg-opacity-95 rounded-xl p-4 md:p-6 text-center shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 hover:scale-105">
              <div className="text-4xl md:text-5xl mb-3 md:mb-4">📊</div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Track Records</h3>
              <p className="text-gray-600 text-xs md:text-sm">
                Automatically track wins and losses against each friend with detailed statistics
              </p>
            </div>
            
            <div className="bg-white bg-opacity-95 rounded-xl p-4 md:p-6 text-center shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 hover:scale-105">
              <div className="text-4xl md:text-5xl mb-3 md:mb-4">🔄</div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Auto Sync</h3>
              <p className="text-gray-600 text-xs md:text-sm">
                Battles are automatically synced from the Clash Royale API - no manual entry needed
              </p>
            </div>
            
            <div className="bg-white bg-opacity-95 rounded-xl p-4 md:p-6 text-center shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 hover:scale-105">
              <div className="text-4xl md:text-5xl mb-3 md:mb-4">🎮</div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">1v1 Focus</h3>
              <p className="text-gray-600 text-xs md:text-sm">
                Only tracks head-to-head 1v1 battles, keeping your stats clean and accurate
              </p>
            </div>
          </div>
        </AnimatedSection>

        {/* How to Find Your Player Tag Section - collapsible on mobile */}
        <MobileTutorialSection />

        {/* CTA Section - always visible */}
        <AnimatedSection delay={800}>
          <div className="text-center mb-6 md:mb-0">
            <div className="inline-block bg-black/30 backdrop-blur-sm rounded-2xl px-6 py-4 md:px-10 md:py-6">
              <Link
                href="/signup"
                className="inline-block px-6 md:px-10 py-3 md:py-5 bg-orange-600 text-white text-lg md:text-xl font-bold rounded-xl hover:bg-orange-700 transition-all shadow-2xl hover:shadow-orange-500/50 transform hover:scale-105 transition-transform duration-200"
              >
                Get Started 🚀
              </Link>
              <p className="mt-4 md:mt-6 text-blue-100 text-sm md:text-lg">
                Already have an account?{' '}
                <Link href="/login" className="text-white font-semibold hover:underline hover:text-orange-200 transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}

// Mobile-friendly tutorial section component
function MobileTutorialSection() {
  return (
    <AnimatedSection delay={600}>
      <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl p-4 md:p-8 mb-6 md:mb-12 max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 text-center">
          How to Find Your Player Tag
        </h2>
        <p className="text-sm md:text-base text-gray-600 text-center mb-4 md:mb-8">
          You'll need your Clash Royale player tag to get started. Here's how to find it:
        </p>
        
        {/* Desktop: Show all 3 steps */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 mb-8">
          <TutorialStep 
            stepNumber={1}
            imageSrc="/images/find-tag-step1.png"
            title="Select player name"
            description="Tap on your player name at the top of the game screen"
          />
          <TutorialStep 
            stepNumber={2}
            imageSrc="/images/find-tag-step2.png"
            title="Select player tag"
            description="Your player tag will be displayed below your name (e.g., #COG20PR2)"
          />
          <TutorialStep 
            stepNumber={3}
            imageSrc="/images/find-tag-step3.png"
            title="Copy Tag"
            description="Tap the &quot;Copy Tag&quot; button to copy your player tag to your clipboard"
          />
        </div>

        {/* Mobile: Show only first step with link to expand */}
        <div className="md:hidden space-y-4 mb-4">
          <TutorialStep 
            stepNumber={1}
            imageSrc="/images/find-tag-step1.png"
            title="Select player name"
            description="Tap on your player name at the top of the game screen"
          />
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Need help? The full tutorial is available on desktop.
            </p>
            <p className="text-xs text-gray-500">
              Steps 2 & 3: Find your tag below your name and tap &quot;Copy Tag&quot;
            </p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-3 md:p-4 text-center border-2 border-blue-100">
          <p className="text-xs md:text-sm text-gray-700 mb-2">
            <span className="font-semibold">Example Player Tag:</span>
          </p>
          <code className="text-base md:text-lg font-mono font-semibold text-blue-600 bg-white px-3 md:px-4 py-1 md:py-2 rounded border border-blue-200">
            #COG20PR2
          </code>
        </div>
      </div>
    </AnimatedSection>
  );
}

// Tutorial step component
function TutorialStep({ 
  stepNumber, 
  imageSrc, 
  title, 
  description 
}: { 
  stepNumber: number; 
  imageSrc: string; 
  title: string; 
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mb-4 relative w-full aspect-[688/560] bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300 shadow-md hover:shadow-lg transition-shadow">
        <Image 
          src={imageSrc} 
          alt={`Step ${stepNumber}: ${title}`}
          fill
          className="object-cover"
        />
      </div>
      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
        {stepNumber}. {title}
      </h3>
      <p className="text-xs md:text-sm text-gray-600">
        {description}
      </p>
    </div>
  );
}
