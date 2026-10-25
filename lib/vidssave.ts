// Sumber audio lewat vidssave.com (API tidak resmi, bisa berubah kapan saja).
import crypto from 'node:crypto';

const UA = 'Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0';
const BASE_KEY = '4c9b7d2e'.repeat(3);
const FALLBACK_KEYS = [BASE_KEY + '4c9b7d2e', 'rz18efAXUbdiaO7k'];

let authKey = '4c9b7d21';
let authAt = 0;

const cache = new Map<string, { url: string; quality: string; exp: number }>();

// Ambil kunci auth terbaru dari file JS situs mereka (di-cache 15 menit).
async function refreshAuth(): Promise<string> {
  if (Date.now() - authAt < 15 * 60 * 1000) return authKey;
  try {
    const home = await fetch('https://vidssave.com/', { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    const html = await home.text();
    const chunks = html.match(/src="([^"]*chunk[^"]*\.js)"/g) || [];
    for (const m of chunks) {
      const path = m.replace(/^src="/, '').replace(/"$/, '');
      const url = path.startsWith('http') ? path : `https://vidssave.com${path}`;
      const js = await (await fetch(url, { signal: AbortSignal.timeout(6000) })).text();
      const a = js.match(/auth:"([a-zA-Z0-9_-]{6,32})"/);
      if (a) {
        authKey = a[1];
        authAt = Date.now();
        return authKey;
      }
    }
  } catch {}
  authAt = Date.now() - 14 * 60 * 1000; // coba lagi sebentar lagi
  return authKey;
}

function decrypt(b64: string): { title?: string; resources?: { type?: string; quality?: string; download_url?: string }[] } | null {
  const keys = [BASE_KEY + authKey, ...FALLBACK_KEYS];
  const data = Buffer.from(b64, 'base64');
  for (const k of keys) {
    if (![16, 24, 32].includes(k.length)) continue;
    try {
      const algo = k.length === 16 ? 'aes-128-cbc' : k.length === 24 ? 'aes-192-cbc' : 'aes-256-cbc';
      const d = crypto.createDecipheriv(algo, Buffer.from(k, 'utf8'), Buffer.from(k.slice(0, 16), 'utf8'));
      d.setAutoPadding(false);
      const out = Buffer.concat([d.update(data), d.final()]).toString('utf8').replace(/\0+$/, '');
      const j = JSON.parse(out);
      if (j && (j.resources || j.title)) return j;
    } catch {}
  }
  return null;
}

async function parse(id: string, auth: string) {
  const body = new URLSearchParams({
    hostname: 'vidssave.com',
    auth,
    domain: 'api-ak.vidssave.com',
    link: `https://www.youtube.com/watch?v=${id}`
  });
  const res = await fetch('https://api.vidssave.com/api/contentsite_api/media/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: body.toString(),
    signal: AbortSignal.timeout(8000),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function resolveVidssave(id: string): Promise<{ url: string; quality: string }> {
  const hit = cache.get(id);
  if (hit && hit.exp > Date.now()) return hit;

  let j = await parse(id, authKey);
  if (!j || j.status !== 1 || !j.data) {
    authAt = 0;
    const fresh = await refreshAuth();
    j = await parse(id, fresh);
  }
  if (!j || j.status !== 1 || !j.data) throw new Error(`ditolak ${JSON.stringify(j).slice(0, 120)}`);

  const info = decrypt(String(j.data));
  if (!info) throw new Error('gagal dekripsi respons');

  const all = (info.resources || []).filter((r) => r.download_url);
  const audio = all.filter((r) => r.type === 'audio');
  const pool = audio.length ? audio : all;
  if (!pool.length) throw new Error('tidak ada resource audio');

  const order = ['128KBPS', '256KBPS', 'LOW', '48KBPS', '360P', '480P', '720P'];
  const rank = (q?: string) => {
    const i = order.indexOf(q || '');
    return i === -1 ? 99 : i;
  };
  pool.sort((a, b) => rank(a.quality) - rank(b.quality));

  const v = { url: pool[0].download_url as string, quality: pool[0].quality || '' };
  cache.set(id, { ...v, exp: Date.now() + 3 * 60 * 1000 });
  if (cache.size > 200) cache.delete(cache.keys().next().value as string);
  return v;
}

// Dipakai route /api/vs-auth supaya browser bisa memanggil vidssave sendiri (jalur cadangan).
export async function getVidssaveAuth(): Promise<string> {
  return refreshAuth();
}
