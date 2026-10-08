import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Track Clash Royale Battles Against Friends",
  description: "Learn how Rival Royale records eligible Clash Royale 1v1 results against tracked friends, refreshes available history, and helps you explore decks and matchups.",
  openGraph: {
    title: "Track Clash Royale Battles Against Friends | Rival Royale",
    description: "Learn how Rival Royale tracks eligible results and connects friend deck insights with Clash Royale matchup tools.",
  },
  alternates: { canonical: '/info' },
};

export default function InfoPage() {
  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "How to Track Clash Royale Wins Against Friends",
    "description": "Guide to tracking eligible Clash Royale battles against friends with Rival Royale.",
    "author": {
      "@type": "Organization",
      "name": "Rival Royale"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Rival Royale"
    },
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
                A Clash Royale head-to-head tracker organizes available 1v1 results against specific players. Rival Royale can sync recent eligible battle records through the game API and calculate summaries from the records it has; API history may not include every older match.
              </p>
              <p className="text-gray-700">
                Rival Royale focuses this record on eligible head-to-head 1v1 battles. Team battles and unsupported modes are excluded, and a partial API history should not be read as a complete lifetime record.
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
                    Create an account on Rival Royale and enter your player tag.
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
                    When sync is enabled, refresh the recent eligible battles available from the API. Your dashboard summarizes the records it has:
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
                <li>Eligible recent battles can be retrieved from the game API</li>
                <li>Available history may not include every older battle</li>
                <li>Refresh tracked battle history from your dashboard when sync is enabled</li>
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
                Summaries reflect the eligible battle records currently stored for your account. The available API history can be shorter than your full playing history.
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
                The tracker stores win and loss totals. When history collection is enabled, it retains eligible recorded 1v1 matches for you and your tracked friends, including both decks, levels, tower troops, and outcomes. Deck and skill summaries use the latest 100 records. Game credentials are never stored.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Frequently Asked Questions
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Do I need my game password?
                  </h3>
                  <p className="text-gray-700">
                    No. Sign up with your player tag; Rival Royale does not need your Clash Royale account password.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    How often are battles synced?
                  </h3>
                  <p className="text-gray-700">
                    Sync availability depends on the current account and feature configuration. When enabled, use the dashboard to refresh eligible recent matches; the game API may omit older records.
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

