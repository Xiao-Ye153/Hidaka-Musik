import { NextResponse } from 'next/server';
import { getVidssaveAuth } from '@/lib/vidssave';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ auth: await getVidssaveAuth() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ auth: '' }, { status: 502 });
  }
}
