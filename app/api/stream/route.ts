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
    const headers: Record<string, string> = {
      'User-Agent': UA,
      Referer: 'https://yt.savetube.me/',
      Origin: 'https://yt.savetube.me',
      Accept: '*/*'
    };
    const range = req.headers.get('range');
    if (range) headers.Range = range;

    const up = await fetch(url, { headers, redirect: 'follow', cache: 'no-store' });
    const type = up.headers.get('content-type') || '';

    if (!up.ok || !up.body || /text\/html|application\/json/i.test(type)) {
      return NextResponse.json(
        { error: `CDN menolak (status ${up.status}, tipe ${type || '-'}, akhir ${new URL(up.url).host})` },
        { status: 502 }
      );
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
