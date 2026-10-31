import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy and Data Use",
  description:
    "How Rival Royale uses account information, public game records, analytics and advertising technologies.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f7f5ef] px-4 py-12 text-slate-900">
      <article className="mx-auto max-w-3xl space-y-8 rounded-lg bg-white p-6 shadow-sm sm:p-10">
        <header>
          <h1 className="text-4xl font-black">Privacy and data use</h1>
          <p className="mt-3 text-sm text-slate-500">
            Updated October 22, 2026
          </p>
          <p className="mt-4 leading-7">
            Rival Royale is an independent companion for Clash Royale. This page
            describes the information used by its tracking and analysis features
            and the services integrated into the site.
          </p>
        </header>
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Account and game information</h2>
          <p className="leading-7">
            Signing up uses your email address, account identifier,
            authentication information and player tag. Supabase provides
            authentication and database storage. Rival Royale does not ask for
            your Clash Royale password. A player tag by itself does not verify
            ownership of a game account.
          </p>
          <p className="leading-7">
            Tracking stores friend tags and names, aggregate results and
            eligible battle records, including decks, card levels, tower troops,
            battle times and outcomes. When enabled, matchup analysis adds deck
            estimates and score summaries. The app keeps up to 50 full eligible
            records per tracked subject; compact deck totals and aggregate
            records can continue beyond that window.
          </p>
          <p className="leading-7">
            Removing a tracked friend removes that relationship&apos;s recorded
            history and summaries. Signing out ends your session; it does not
            delete your stored tracking records.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Public tools and sharing</h2>
          <p className="leading-7">
            The lookup remembers up to five recently searched player tags on
            this browser. Use Clear recent tags below the lookup to remove them.
            Downloaded score cards are created locally; using Share sends the
            selected result through your chosen sharing app. Public lookup, when
            available, requests the supplied tag&apos;s recent public battle log
            without enrolling it in ongoing account tracking. Results may be
            reused in server memory for up to five minutes. Deck analysis sends
            deck information to our model service hosted on Railway. It does not
            need your game password.
          </p>
          <p className="leading-7">
            Account tracking is private to the account through the application.
            If you create a public rivalry share, anyone with its link can view
            the selected snapshot. Revoking a link cannot remove copies already
            cached or saved by another service.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">
            Cookies, analytics and service logs
          </h2>
          <p className="leading-7">
            Authentication uses browser cookies to maintain your session. The
            site includes Vercel Analytics and, when configured, PostHog for
            usage analytics. PostHog can associate activity with your account
            identifier after sign-in and use browser storage for its analytics
            identifiers; session recording is disabled in the application
            configuration.
          </p>
          <p className="leading-7">
            Hosting and service providers process technical request information
            to deliver and operate the site. Public request limits use a keyed
            digest of a network address. Shared networks can share a usage
            limit. Blocking cookies or browser storage can affect sign-in and
            other features.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Advertising</h2>
          <p className="leading-7">
            When advertising is enabled, Google and other third-party vendors
            may use cookies, web beacons or IP addresses to serve and measure
            ads. Advertising cookies may personalize ads based on visits to this
            and other sites. Advertising availability depends on the site
            configuration and Google&apos;s approval.
          </p>
          <p className="leading-7">
            Learn{" "}
            <a
              href="https://policies.google.com/technologies/partner-sites"
              className="text-[#a73b13] underline"
            >
              how Google uses information from partner sites
            </a>
            . You can manage personalized advertising through{" "}
            <a
              href="https://myadcenter.google.com/"
              className="text-[#a73b13] underline"
            >
              Google My Ad Center
            </a>{" "}
            and browser cookie controls. Other vendors may offer controls
            through{" "}
            <a
              href="https://www.aboutads.info/choices/"
              className="text-[#a73b13] underline"
            >
              YourAdChoices
            </a>
            .
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Questions</h2>
          <p className="leading-7">
            See{" "}
            <Link href="/about" className="text-[#a73b13] underline">
              About &amp; feedback
            </Link>{" "}
            for the public project issue tracker. Do not include account emails,
            passwords, authentication links or private records in a public
            issue.
          </p>
        </section>
      </article>
    </main>
  );
}
