import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') || '';
  const artist = searchParams.get('artist') || '';
  if (!title) return NextResponse.json([], { status: 400 });

  const tries = [
    `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`,
    `https://lrclib.net/api/search?q=${encodeURIComponent(title)}`,
    `https://lrclib.net/api/search?q=${encodeURIComponent(`${title} ${artist}`.trim())}`
  ];

  for (const url of tries) {
    try {
      const r = await fetch(url, {
        headers: { 'Lrclib-Client': 'NadaMusic/1.0', 'User-Agent': 'NadaMusic/1.0' },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000)
      });
      const data = await r.json();
      if (Array.isArray(data) && data.length) {
        return NextResponse.json(data, { headers: { 'Cache-Control': 's-maxage=3600' } });
      }
    } catch {}
  }
  return NextResponse.json([]);
}
