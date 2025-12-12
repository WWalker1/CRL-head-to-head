import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "How to Track Clash Royale Battles Against Friends - Complete Guide",
  description: "Complete guide on how to track your Clash Royale wins and losses against friends. Learn how to use the free head-to-head battle tracker, sync battles automatically, and view detailed statistics.",
  openGraph: {
    title: "How to Track Clash Royale Battles Against Friends - Complete Guide",
    description: "Complete guide on how to track your Clash Royale wins and losses against friends using the free battle tracker.",
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL 
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/info`
      : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/info` : 'https://your-domain.com/info'),
  },
};

export default function InfoPage() {
  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "How to Track Clash Royale Wins Against Friends",
    "description": "Complete guide on tracking Clash Royale battles against friends using the free head-to-head tracker",
    "author": {
      "@type": "Organization",
      "name": "CRL Tracker"
    },
    "publisher": {
      "@type": "Organization",
      "name": "CRL Tracker"
    },
    "datePublished": "2024-01-01",
    "dateModified": new Date().toISOString().split('T')[0],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }}
      />
      <div className="min-h-screen animated-gradient">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
          <article className="bg-white rounded-xl md:rounded-2xl shadow-2xl p-6 md:p-10">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How to Track Clash Royale Wins Against Friends
            </h1>
            
            <p className="text-lg text-gray-700 mb-8">
              If you're looking for a way to track your Clash Royale wins and losses against friends, 
              you've come to the right place. This comprehensive guide will show you exactly how to use 
              a free battle tracker to monitor your head-to-head statistics.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                What is a Clash Royale Head-to-Head Tracker?
              </h2>
              <p className="text-gray-700 mb-4">
                A Clash Royale head-to-head tracker is a tool that automatically monitors and records 
                your 1v1 battle results against specific players. Instead of manually keeping track of 
                wins and losses, the tracker syncs directly with the Clash Royale API to pull your 
                battle history and calculate statistics.
              </p>
              <p className="text-gray-700">
                The CRL Head to Head Tracker focuses exclusively on 1v1 battles, filtering out 2v2 matches, 
                challenges, and other game modes to give you accurate statistics about your performance 
                against each friend.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                How to Get Started Tracking Your Battles
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Step 1: Find Your Player Tag
                  </h3>
                  <p className="text-gray-700 mb-2">
                    Your Clash Royale player tag is a unique identifier that looks like #COG20PR2. To find it:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                    <li>Open the Clash Royale app</li>
                    <li>Tap on your player name at the top of the screen</li>
                    <li>Your player tag will be displayed below your name</li>
                    <li>Tap "Copy Tag" to copy it to your clipboard</li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Step 2: Sign Up for the Tracker
                  </h3>
                  <p className="text-gray-700">
                    Create a free account on the CRL Head to Head Tracker and enter your player tag. 
                    The tracker uses your player tag to identify you in the Clash Royale API - no passwords 
                    or game credentials needed.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Step 3: Add Your Friends
                  </h3>
                  <p className="text-gray-700">
                    Once you're signed up, add your friends' player tags to start tracking battles. 
                    You can add as many friends as you want, and each will have their own statistics card 
                    showing your win/loss record against them.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Step 4: View Your Statistics
                  </h3>
                  <p className="text-gray-700">
                    The tracker automatically syncs battles daily, but you can also manually trigger a 
                    sync at any time. Your dashboard will show:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>Total wins and losses against each friend</li>
                    <li>Win percentage for each matchup</li>
                    <li>Visual progress bars for quick stat overview</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                How Does Automatic Battle Syncing Work?
              </h2>
              <p className="text-gray-700 mb-4">
                The tracker connects directly to the official Clash Royale API to fetch your battle history. 
                This means:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mb-4">
                <li>No manual entry required - battles are automatically detected</li>
                <li>Daily automatic syncs keep your statistics up-to-date</li>
                <li>Manual sync option available for immediate updates</li>
                <li>Only 1v1 battles are tracked for accurate head-to-head statistics</li>
              </ul>
              <p className="text-gray-700">
                The system intelligently filters battles to only include head-to-head 1v1 matches, 
                ensuring your statistics reflect true competitive performance against friends.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                What Statistics Can You Track?
              </h2>
              <p className="text-gray-700 mb-4">
                For each friend you add, the tracker displays:
              </p>
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">• Win/Loss Record:</span>
                    <span>Total number of wins and losses in your 1v1 battles</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">• Win Percentage:</span>
                    <span>Calculated percentage showing your success rate</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">• Visual Progress Bars:</span>
                    <span>Quick visual representation of your win rate</span>
                  </li>
                </ul>
              </div>
              <p className="text-gray-700">
                All statistics are calculated in real-time based on your battle history from the Clash Royale API.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Why Track Your Clash Royale Battles?
              </h2>
              <p className="text-gray-700 mb-4">
                Tracking your battles against friends offers several benefits:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li><strong>Competitive Insight:</strong> See who you perform best against and identify areas for improvement</li>
                <li><strong>Friendly Competition:</strong> Add an extra layer of fun to your matches with tracked statistics</li>
                <li><strong>Progress Tracking:</strong> Monitor how your performance changes over time</li>
                <li><strong>No Manual Work:</strong> Automatic syncing means you can focus on playing, not tracking</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Privacy and Data Security
              </h2>
              <p className="text-gray-700 mb-4">
                The tracker is designed with privacy in mind. We only store:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mb-4">
                <li>Your player tag (publicly available information)</li>
                <li>Friend player tags and names</li>
                <li>Aggregated win/loss statistics</li>
              </ul>
              <p className="text-gray-700">
                We don't store full battle logs, deck compositions, or any sensitive game credentials. 
                The tracker uses a minimal data approach while still providing full functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Frequently Asked Questions
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Is the tracker free to use?
                  </h3>
                  <p className="text-gray-700">
                    Yes, the CRL Head to Head Tracker is completely free to use. Simply sign up and start tracking your battles.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    How often are battles synced?
                  </h3>
                  <p className="text-gray-700">
                    Battles are automatically synced daily, but you can also manually sync at any time using the "Sync Battles" button.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    What if I can't find my player tag?
                  </h3>
                  <p className="text-gray-700">
                    Your player tag is always visible in your Clash Royale profile. Tap on your name at the top of the game screen, 
                    and your tag will be displayed below your name. If you're still having trouble, check the tutorial on the homepage.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Can I track battles against players who aren't my friends?
                  </h3>
                  <p className="text-gray-700">
                    The tracker focuses on tracking battles against friends you've added. You can add any player's tag to track 
                    your battles against them, as long as you have their player tag.
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-10 pt-8 border-t border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to Start Tracking?
              </h2>
              <p className="text-gray-700 mb-6">
                Now that you know how to track your Clash Royale wins against friends, it's time to get started. 
                The process is simple, free, and takes just a few minutes to set up.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="inline-block px-6 py-3 bg-orange-600 text-white text-lg font-bold rounded-xl hover:bg-orange-700 transition-all shadow-xl hover:shadow-2xl text-center"
                >
                  Get Started Free 🚀
                </Link>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-gray-200 text-gray-900 text-lg font-semibold rounded-xl hover:bg-gray-300 transition-all text-center"
                >
                  Back to Home
                </Link>
              </div>
            </section>
          </article>
        </div>
      </div>
    </>
  );
}

