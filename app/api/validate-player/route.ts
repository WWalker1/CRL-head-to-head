import { NextRequest, NextResponse } from 'next/server';
import { getPlayerInfo } from '@/lib/clashRoyaleApi';
import { checkAnonymousRateLimit } from '@/lib/anonymous-rate-limit';
import { reserveGameApi } from '@/lib/game-api-budget';

export async function POST(request: NextRequest) {
  try {
    const limited = await checkAnonymousRateLimit(request, 'player_validation');
    if (limited) return limited;
    const { playerTag } = await request.json();

    if (!playerTag) {
      return NextResponse.json({ error: 'Player tag is required' }, { status: 400 });
    }

    const reservation = await reserveGameApi(request, null, 'validate');
    if (reservation.response) return reservation.response;
    const playerInfo = await getPlayerInfo(playerTag);
    
    return NextResponse.json({ valid: true, playerInfo });
  } catch (error: any) {
    if (error.message?.includes('Clash Royale API error')) {
      return NextResponse.json({ error: 'Invalid player tag' }, { status: 400 });
    }
    console.error('Error validating player:', error);
    return NextResponse.json({ error: 'Failed to validate player' }, { status: 500 });
  }
}

