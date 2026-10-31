import { NextRequest } from 'next/server';
import { readPublicPlayerSnapshot } from '@/lib/public-player';
import { handlePublicPlayerRequest } from '@/lib/public-player-route';

export const maxDuration = 30;
export function POST(request: NextRequest) {
  return handlePublicPlayerRequest(request, readPublicPlayerSnapshot);
}
