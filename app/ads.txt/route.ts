import { getAdSenseConfig } from '@/lib/adsense';

export const dynamic = 'force-dynamic';

export function GET() {
  const { publisherId } = getAdSenseConfig();
  if (!publisherId) return new Response('Not configured\n', { status: 404 });
  return new Response(`google.com, ${publisherId.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}
