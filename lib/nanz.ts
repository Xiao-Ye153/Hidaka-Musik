// Sumber cadangan: endpoint /api/ytplay milik teman (dengan izinnya). Hanya JSON kecil yang diminta,
// file audionya tetap diambil dari CDN, bukan lewat server dia.
// Alamat bisa diganti lewat env NANZ_API_BASE. Isi "off" untuk mematikan sumber ini.
const UA = 'Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0';
const DEFAULT_BASE = 'https://nanzmusify-updated.netlify.app';

const cache = new Map<string, { url: string; exp: number }>();

export async function resolveNanz(id: string): Promise<{ url: string }> {
  const base = (process.env.NANZ_API_BASE || DEFAULT_BASE).trim().replace(/\/$/, '');
  if (base.toLowerCase() === 'off') throw new Error('dimatikan');

  const hit = cache.get(id);
  if (hit && hit.exp > Date.now()) return hit;

  const res = await fetch(`${base}/api/ytplay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify({ query: `https://youtube.com/watch?v=${id}` }),
    signal: AbortSignal.timeout(8000),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const j = await res.json().catch(() => null);
  const url: string | undefined = j?.status && j?.result?.download?.audio ? j.result.download.audio : j?.url;
  if (!url || typeof url !== 'string') throw new Error(`tanpa url ${JSON.stringify(j).slice(0, 100)}`);

  const v = { url, exp: Date.now() + 3 * 60 * 1000 };
  cache.set(id, v);
  if (cache.size > 200) cache.delete(cache.keys().next().value as string);
  return v;
}
