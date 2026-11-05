import { NextResponse } from 'next/server';
import { debugSearch, searchJoox } from '@/lib/joox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Kata-kata pencarian ala YouTube yang bikin Joox gak nemu apa-apa.
const NOISE = /\b(official|music video|video|playlist|mv|lyrics?|lirik)\b/gi;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const max = Math.min(Math.max(Number(searchParams.get('max') || 12), 1), 30);
  if (!q) return NextResponse.json({ error: 'Query required' }, { status: 400 });

  if (searchParams.get('debug') === '1') {
    try {
      return NextResponse.json(await debugSearch(q));
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 502 });
    }
  }

  const cleaned = q.replace(NOISE, ' ').replace(/\s+/g, ' ').trim() || q;
  const words = cleaned.split(' ');
  const attempts = Array.from(new Set([cleaned, words.slice(0, 3).join(' '), words.slice(0, 2).join(' '), words[0]])).filter(Boolean);

  let lastErr = '';
  for (const a of attempts) {
    try {
      const r = await searchJoox(a);
      if (r.length) {
        const tracks = r.slice(0, max).map((t) => ({ id: t.id, title: t.title, channel: t.artist, thumb: t.thumb }));
        return NextResponse.json(tracks, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate' } });
      }
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }
  if (lastErr) return NextResponse.json({ error: lastErr }, { status: 502 });
  return NextResponse.json([], { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate' } });
}
