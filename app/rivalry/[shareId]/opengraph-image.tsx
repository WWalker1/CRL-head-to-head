import { ImageResponse } from 'next/og';
import { getPublicRivalrySnapshot } from '@/lib/rivalry-public';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function Image({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const snapshot = await getPublicRivalrySnapshot(shareId);
  return new ImageResponse(
    <div style={{ width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px', color: 'white', background: 'linear-gradient(135deg,#172554,#ea580c)' }}>
      <div style={{ fontSize: 32 }}>Rivalry snapshot</div>
      <div style={{ fontSize: 72, fontWeight: 700, marginTop: 24 }}>{snapshot?.friendName || 'Rival Royale'}</div>
      <div style={{ fontSize: 64, marginTop: 30 }}>{snapshot ? `${snapshot.record.wins}–${snapshot.record.losses}` : 'Head to head'}</div>
    </div>,
  );
}
