import { NextRequest } from 'next/server';
import { readPublicOpponentSnapshot } from '@/lib/public-player';
import { handlePublicPlayerRequest } from '@/lib/public-player-route';

export const maxDuration = 15;
export function POST(request: NextRequest) {
  return handlePublicPlayerRequest(request, readPublicOpponentSnapshot);
}
