import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "@/components/Navbar";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://your-domain.com');

export const metadata: Metadata = {
  title: {
    default: "CRL Head to Head Tracker - Track Clash Royale Wins Against Friends",
    template: "%s | CRL Head to Head Tracker"
  },
  description: "Track your Clash Royale wins and losses against friends. Free head-to-head battle tracker with automatic sync from the Clash Royale API. See your win/loss record and statistics against each friend.",
  keywords: [
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
    url: baseUrl,
    siteName: "CRL Head to Head Tracker",
    title: "CRL Head to Head Tracker - Track Clash Royale Wins Against Friends",
    description: "Track your Clash Royale wins and losses against friends. Free head-to-head battle tracker with automatic sync from the Clash Royale API.",
    images: [
      {
        url: `${baseUrl}/images/dashboard-screenshot.png`,
        width: 1200,
        height: 630,
        alt: "CRL Tracker Dashboard - Track Clash Royale battles against friends",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CRL Head to Head Tracker - Track Clash Royale Wins Against Friends",
    description: "Track your Clash Royale wins and losses against friends. Free head-to-head battle tracker with automatic sync.",
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
  alternates: {
    canonical: baseUrl,
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

