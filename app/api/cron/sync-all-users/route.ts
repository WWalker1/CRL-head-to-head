import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Scheduled collection now executes directly in the Railway nightly-battle-sync service. */
export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || request.headers.get('authorization') !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ error: 'Scheduled sync has moved to Railway.' }, {
    status: 410, headers: { 'Cache-Control': 'no-store' },
  });
}
