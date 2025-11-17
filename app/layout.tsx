import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "CRL Head to Head Tracker",
  description: "Track your win/loss record against your Clash Royale friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Analytics />
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

