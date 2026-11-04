import { NextResponse } from 'next/server';
import { getJooxLyrics, resolveJooxId } from '@/lib/joox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';
  const title = searchParams.get('title') || '';
  const artist = searchParams.get('artist') || '';
  if (!id && !title) return NextResponse.json({ synced: [], plain: '' }, { status: 400 });

  try {
    const songId = await resolveJooxId(id, title, artist);
    const lyr = await getJooxLyrics(songId);
    return NextResponse.json(lyr ?? { synced: [], plain: '' }, { headers: { 'Cache-Control': 's-maxage=3600' } });
  } catch {
    return NextResponse.json({ synced: [], plain: '' });
  }
}
