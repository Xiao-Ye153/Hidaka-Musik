import { NextResponse } from 'next/server';
import { QUALITIES, describeError, resolveAudio } from '@/lib/savetube';
import { resolvePiped } from '@/lib/piped';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const UA = 'Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0';
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const BAD_TYPE = /text\/html|application\/json/i;

// Ambil file audio dari URL; coba beberapa variasi header. Hasil null kalau semua gagal.
async function grab(url: string, variants: Record<string, string>[], range: string | null, label: string, notes: string[]) {
  for (let i = 0; i < variants.length; i++) {
    const headers: Record<string, string> = { Accept: '*/*', ...variants[i] };
    if (range) headers.Range = range;
    try {
      const r = await fetch(url, { headers, redirect: 'follow', cache: 'no-store' });
      const t = r.headers.get('content-type') || '';
      if (r.ok && r.body && !BAD_TYPE.test(t)) return { up: r, type: t };
      notes.push(`${label}${i}: ${r.status} ${t || '-'} ${new URL(r.url).host}`);
      await r.body?.cancel();
    } catch (e) {
      notes.push(`${label}${i}: ${describeError(e)}`);
    }
  }
  return null;
}

// Proxy audio: server yang mengambil file, lalu mengalirkannya ke browser.
// Urutan sumber: Piped (gratis) -> SaveTube. Mendukung Range supaya seek dan background play aman.
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

  const range = req.headers.get('range');
  const notes: string[] = [];
  let got: { up: Response; type: string } | null = null;
  let source = '';

  // 1) Piped
  try {
    const p = await resolvePiped(id);
    got = await grab(p.url, [{ 'User-Agent': UA }, { 'User-Agent': DESKTOP_UA }], range, `ambil-${p.source}-`, notes);
    if (got) source = `piped:${p.source}`;
  } catch (e) {
    notes.push(describeError(e));
  }

  // 2) SaveTube
  if (!got) {
    try {
      const { url } = await resolveAudio(id, quality);
      got = await grab(
        url,
        [
          { 'User-Agent': UA, Referer: 'https://ytshorts.savetube.me/', Origin: 'https://ytshorts.savetube.me' },
          { 'User-Agent': UA, Referer: 'https://yt.savetube.me/', Origin: 'https://yt.savetube.me' },
          { 'User-Agent': UA }
        ],
        range,
        'savetube-',
        notes
      );
      if (got) source = 'savetube';
    } catch (e) {
      notes.push(`savetube: ${describeError(e)}`);
    }
  }

  if (!got) {
    return NextResponse.json({ error: `Semua sumber gagal | ${notes.join(' | ')}` }, { status: 502 });
  }

  const { up, type } = got;
  const mime = /webm/i.test(type) ? 'audio/webm' : /mp4|m4a|aac/i.test(type) ? 'audio/mp4' : /^audio\//i.test(type) ? type : 'audio/mpeg';
  const ext = mime === 'audio/webm' ? 'webm' : mime === 'audio/mp4' ? 'm4a' : 'mp3';

  const out = new Headers();
  out.set('Content-Type', mime);
  for (const h of ['content-length', 'content-range', 'accept-ranges']) {
    const v = up.headers.get(h);
    if (v) out.set(h, v);
  }
  if (!out.has('accept-ranges')) out.set('Accept-Ranges', 'bytes');
  out.set('Cache-Control', 'private, no-store');
  out.set('X-Audio-Source', source);
  if (dl) out.set('Content-Disposition', `attachment; filename="${name}.${ext}"`);

  return new Response(up.body, { status: up.status === 206 ? 206 : 200, headers: out });
}
