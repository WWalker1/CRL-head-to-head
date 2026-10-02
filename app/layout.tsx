import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "@/components/Navbar";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Rival Royale | Clash Royale Matchups, Counter Decks & Friend Stats",
    template: "%s | Rival Royale"
  },
  description: "Compare Clash Royale decks, explore model-ranked counter candidates, and track recorded battles against friends with Rival Royale.",
  keywords: [
    "clash royale deck matchup",
    "clash royale counter deck finder",
    "clash royale friend deck analysis",
    "clash royale player statistics",
    "rival royale",
    "clash royale tracker",
    "track clash royale wins",
    "clash royale head to head",
    "clash royale friend tracker",
    "clash royale battle tracker",
    "how to track clash royale wins against friends",
    "clash royale statistics",
    "clash royale win loss record",
    "1v1 clash royale tracker",
    "clash royale vs friends",
    "clash royale head to head stats"
  ],
  authors: [{ name: "CRL Tracker" }],
  creator: "CRL Tracker",
  publisher: "CRL Tracker",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Rival Royale",
    title: "Rival Royale | Clash Royale Matchups, Counter Decks & Friend Stats",
    description: "Compare Clash Royale decks, explore model-ranked counter candidates, and track recorded battles against friends.",
    images: [
      {
        url: `${baseUrl}/images/dashboard-screenshot.png`,
        width: 1200,
        height: 630,
        alt: "Rival Royale dashboard for Clash Royale head-to-head battle statistics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rival Royale | Clash Royale Matchups, Counter Decks & Friend Stats",
    description: "Compare Clash Royale decks, explore counter candidates, and track recorded battles against friends.",
    images: [`${baseUrl}/images/dashboard-screenshot.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Navbar />
        {children}
        <Analytics />
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

