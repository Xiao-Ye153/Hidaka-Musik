// Sumber audio cadangan lewat instance Piped (publik, gratis).
// Daftar instance bisa diganti lewat env PIPED_INSTANCES (pisahkan dengan koma),
// misalnya: https://pipedapi.contoh.com,https://api.piped.contoh2.com
const UA = 'Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0';

const DEFAULTS = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.private.coffee',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.smnz.de'
];

function instances(): string[] {
  const env = process.env.PIPED_INSTANCES;
  const list = env ? env.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean) : DEFAULTS;
  return list.length ? list : DEFAULTS;
}

type PStream = { url?: string; mimeType?: string; format?: string; bitrate?: number; videoOnly?: boolean };

const cache = new Map<string, { v: { url: string; source: string }; exp: number }>();

export async function resolvePiped(id: string): Promise<{ url: string; source: string }> {
  const hit = cache.get(id);
  if (hit && hit.exp > Date.now()) return hit.v;

  // Semua instance dicoba paralel, yang pertama berhasil dipakai.
  const tries = instances().map(async (base) => {
    const res = await fetch(`${base}/streams/${id}`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`${new URL(base).host}: HTTP ${res.status}`);
    const data = await res.json();
    const streams: PStream[] = (data?.audioStreams || []).filter((s: PStream) => s.url && !s.videoOnly);
    if (!streams.length) throw new Error(`${new URL(base).host}: tanpa audioStreams`);
    // Utamakan m4a (paling kompatibel di Chrome/Safari), lalu bitrate tertinggi.
    const m4a = streams.filter((s) => /mp4|m4a/i.test(`${s.mimeType || ''} ${s.format || ''}`));
    const pool = (m4a.length ? m4a : streams).slice().sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    return { url: pool[0].url as string, source: new URL(base).host };
  });

  try {
    const v = await Promise.any(tries);
    cache.set(id, { v, exp: Date.now() + 3 * 60 * 1000 });
    if (cache.size > 200) cache.delete(cache.keys().next().value as string);
    return v;
  } catch (e) {
    const errs = ((e as { errors?: Error[] }).errors || []).map((x) => x.message);
    throw new Error(`piped: ${errs.join(' ; ') || 'semua instance gagal'}`);
  }
}
