import { NextResponse } from 'next/server';
import { JOOX_HEADERS, getMid, resolveJooxId, streamCandidates } from '@/lib/joox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BAD_TYPE = /text\/html|application\/json/i;

// Proxy audio Joox: server ngambil file m4a, lalu dialirkan ke browser.
// Range diteruskan supaya seek dan background play aman.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';
  const title = searchParams.get('title') || '';
  const artist = searchParams.get('artist') || '';
  const dl = searchParams.get('dl') === '1';
  const name = (searchParams.get('name') || title || 'lagu').replace(/[^\w\- ]+/g, '').trim().slice(0, 80) || 'lagu';

  if (!id) return NextResponse.json({ error: 'ID lagu kosong' }, { status: 400 });

  const notes: string[] = [];
  let mid = '';
  try {
    const songId = await resolveJooxId(id, title, artist);
    mid = await getMid(songId);
  } catch (e) {
    return NextResponse.json({ error: `Joox: ${(e as Error).message}` }, { status: 502 });
  }

  const range = req.headers.get('range');
  let up: Response | null = null;
  let type = '';
  for (const url of streamCandidates(mid)) {
    const host = new URL(url).host;
    try {
      const headers: Record<string, string> = { ...JOOX_HEADERS, Accept: '*/*' };
      if (range) headers.Range = range;
      const r = await fetch(url, { headers, redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const t = r.headers.get('content-type') || '';
      if (r.ok && r.body && !BAD_TYPE.test(t)) {
        up = r;
        type = t;
        break;
      }
      notes.push(`${host}: ${r.status} ${t || '-'}`);
      await r.body?.cancel();
    } catch (e) {
      notes.push(`${host}: ${(e as Error)?.name || 'error'}`);
    }
  }

  if (!up) {
    return NextResponse.json({ error: `Semua server Joox gagal | ${notes.join(' | ')}` }, { status: 502 });
  }

  const out = new Headers();
  out.set('Content-Type', /^audio\//i.test(type) ? type : 'audio/mp4');
  for (const h of ['content-length', 'content-range', 'accept-ranges']) {
    const v = up.headers.get(h);
    if (v) out.set(h, v);
  }
  if (!out.has('accept-ranges')) out.set('Accept-Ranges', 'bytes');
  out.set('Cache-Control', 'private, no-store');
  out.set('X-Audio-Source', 'joox');
  if (dl) out.set('Content-Disposition', `attachment; filename="${name}.m4a"`);

  return new Response(up.body, { status: up.status === 206 ? 206 : 200, headers: out });
}
