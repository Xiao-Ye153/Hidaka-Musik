import { NextResponse } from 'next/server';
import { QUALITIES, resolveAudio } from '@/lib/savetube';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';
  const q = Number(searchParams.get('q') || 128);
  const quality = QUALITIES.includes(q) ? q : 128;

  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    return NextResponse.json({ error: 'ID video tidak valid' }, { status: 400 });
  }

  try {
    const r = await resolveAudio(id, quality);
    return NextResponse.json(r, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gagal';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
