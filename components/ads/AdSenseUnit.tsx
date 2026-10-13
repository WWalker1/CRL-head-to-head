'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    adsbygoogle?: { push: (entry: Record<string, unknown>) => unknown };
  }
}

export default function AdSenseUnit({ publisherId, slot }: { publisherId: string; slot: string }) {
  const element = useRef<HTMLModElement>(null);
  const requested = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const node = element.current;
    if (!ready || !node) return;
    const requestAd = () => {
      // Avoid duplicate requests under Strict Mode and zero-width responsive ads.
      if (requested.current || !node.isConnected || node.getBoundingClientRect().width <= 0) return;
      requested.current = true;
      if (node.hasAttribute('data-adsbygoogle-status')) return;
      try {
        (window.adsbygoogle = window.adsbygoogle || ([] as Record<string, unknown>[])).push({});
      } catch {
        // Ad blockers or unavailable inventory must not interrupt the tool.
      }
    };
    requestAd();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(requestAd) : null;
    observer?.observe(node);
    return () => observer?.disconnect();
  }, [ready]);

  return <>
    <Script
      id="google-adsense"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
      onReady={() => setReady(true)}
    />
    <ins ref={element} className="adsbygoogle" style={{ display: 'block', minHeight: 100 }}
      data-ad-client={publisherId} data-ad-slot={slot} data-ad-format="horizontal"
      data-full-width-responsive="false" />
  </>;
}
