import { NextResponse } from 'next/server';
import { QUALITIES, describeError, resolveAudio } from '@/lib/savetube';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const UA = 'Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0';

// Proxy audio: server yang mengambil file dari CDN SaveTube (dengan header yang benar),
// lalu mengalirkannya ke browser. Mendukung Range supaya seek dan background play aman.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';
  const q = Number(searchParams.get('q') || 128);
  const quality = QUALITIES.includes(q) ? q : 128;
  const dl = searchParams.get('dl') === '1';
  const name = (searchParams.get('name') || id).replace(/[^\w\- ]+/g, '').trim().slice(0, 80) || id;

  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    return NextResponse.json({ error: 'ID video tidak valid' }, { status: 400 });
  }

  try {
    const { url } = await resolveAudio(id, quality);
    const DESKTOP_UA =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
    const variants: Record<string, string>[] = [
      { 'User-Agent': UA, Referer: 'https://ytshorts.savetube.me/', Origin: 'https://ytshorts.savetube.me' },
      { 'User-Agent': UA, Referer: 'https://yt.savetube.me/', Origin: 'https://yt.savetube.me' },
      { 'User-Agent': UA },
      { 'User-Agent': DESKTOP_UA }
    ];
    const range = req.headers.get('range');
    const notes: string[] = [];
    let up: Response | null = null;
    let type = '';

    for (let i = 0; i < variants.length; i++) {
      const headers: Record<string, string> = { Accept: '*/*', ...variants[i] };
      if (range) headers.Range = range;
      try {
        const r = await fetch(url, { headers, redirect: 'follow', cache: 'no-store' });
        const t = r.headers.get('content-type') || '';
        if (r.ok && r.body && !/text\/html|application\/json/i.test(t)) {
          up = r;
          type = t;
          break;
        }
        notes.push(`v${i}: ${r.status} ${t || '-'} ${new URL(r.url).host}`);
        await r.body?.cancel();
      } catch (e) {
        notes.push(`v${i}: ${describeError(e)}`);
      }
    }

    if (!up) {
      return NextResponse.json({ error: `CDN menolak semua variasi header | ${notes.join(' | ')}` }, { status: 502 });
    }

    const out = new Headers();
    out.set('Content-Type', type.startsWith('audio/') ? type : 'audio/mpeg');
    for (const h of ['content-length', 'content-range', 'accept-ranges']) {
      const v = up.headers.get(h);
      if (v) out.set(h, v);
    }
    if (!out.has('accept-ranges')) out.set('Accept-Ranges', 'bytes');
    out.set('Cache-Control', 'private, no-store');
    if (dl) out.set('Content-Disposition', `attachment; filename="${name}.mp3"`);

    return new Response(up.body, { status: up.status === 206 ? 206 : 200, headers: out });
  } catch (e) {
    return NextResponse.json({ error: describeError(e) }, { status: 502 });
  }
}
