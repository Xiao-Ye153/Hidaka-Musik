// Jalur cadangan: browser pengguna sendiri yang memanggil vidssave (IP pengguna, bukan IP Vercel).
// Dipakai kalau /api/stream gagal, sebelum jatuh ke player YouTube.
const BASE_KEY = '4c9b7d2e'.repeat(3);
const FALLBACK_KEYS = [BASE_KEY + '4c9b7d2e', 'rz18efAXUbdiaO7k'];
const QUALITY_ORDER = ['128KBPS', '256KBPS', 'LOW', '48KBPS', '360P', '480P', '720P'];

type Resource = { type?: string; quality?: string; download_url?: string };

const enc = new TextEncoder();

// Versi TypeScript baru ketat soal tipe buffer; cast ini aman dan bekerja di semua versi.
const bs = (u: Uint8Array) => u as unknown as BufferSource;

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// WebCrypto hanya mendukung PKCS7. Data di sini zero-padded, jadi kita tambahkan satu blok
// "padding valid" di akhir supaya dekripsi tidak menolak, lalu hasilnya sama persis dengan tanpa padding.
async function aesCbcDecryptNoPad(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  if (data.length === 0 || data.length % 16 !== 0) throw new Error('panjang data tidak valid');
  const subtle = crypto.subtle;
  const kDec = await subtle.importKey('raw', bs(key), 'AES-CBC', false, ['decrypt']);
  const kEnc = await subtle.importKey('raw', bs(key), 'AES-CBC', false, ['encrypt']);
  const last = data.slice(data.length - 16);
  const p = new Uint8Array(16);
  for (let i = 0; i < 16; i++) p[i] = last[i] ^ 16;
  const e = new Uint8Array(await subtle.encrypt({ name: 'AES-CBC', iv: bs(new Uint8Array(16)) }, kEnc, bs(p))).slice(0, 16);
  const ext = new Uint8Array(data.length + 16);
  ext.set(data, 0);
  ext.set(e, data.length);
  return new Uint8Array(await subtle.decrypt({ name: 'AES-CBC', iv: bs(iv) }, kDec, bs(ext)));
}

async function decryptPayload(b64: string, auth: string): Promise<{ resources?: Resource[]; title?: string } | null> {
  const data = b64ToBytes(b64);
  for (const k of [BASE_KEY + auth, ...FALLBACK_KEYS]) {
    if (![16, 24, 32].includes(k.length)) continue;
    try {
      const raw = await aesCbcDecryptNoPad(enc.encode(k), enc.encode(k.slice(0, 16)), data);
      const text = new TextDecoder().decode(raw).replace(/\0+$/, '');
      const j = JSON.parse(text);
      if (j && (j.resources || j.title)) return j;
    } catch {}
  }
  return null;
}

async function getAuth(): Promise<string> {
  try {
    const r = await fetch('/api/vs-auth', { cache: 'no-store' });
    const j = await r.json();
    if (j?.auth) return j.auth as string;
  } catch {}
  return '4c9b7d21';
}

async function parseOnce(id: string, auth: string): Promise<{ ok: boolean; json: { status?: number; data?: unknown; msg?: string } | null; err?: string }> {
  const body = new URLSearchParams({
    hostname: 'vidssave.com',
    auth,
    domain: 'api-ak.vidssave.com',
    link: `https://www.youtube.com/watch?v=${id}`
  });
  try {
    const res = await fetch('https://api.vidssave.com/api/contentsite_api/media/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return { ok: false, json: null, err: `HTTP ${res.status}` };
    const json = await res.json();
    return { ok: !!json && json.status === 1 && !!json.data, json };
  } catch (e) {
    return { ok: false, json: null, err: (e as Error)?.name === 'TimeoutError' ? 'timeout' : 'diblok/CORS' };
  }
}

export async function resolveInBrowser(id: string): Promise<string> {
  const serverAuth = await getAuth();
  const auths = Array.from(new Set([serverAuth, '4c9b7d21']));

  let last = '';
  for (const auth of auths) {
    const r = await parseOnce(id, auth);
    if (!r.ok) {
      last = r.err ? `${r.err} (auth ${auth})` : `ditolak ${JSON.stringify(r.json).slice(0, 90)} (auth ${auth})`;
      continue;
    }
    const info = await decryptPayload(String((r.json as { data: unknown }).data), auth);
    if (!info) {
      last = `gagal dekripsi (auth ${auth})`;
      continue;
    }
    const all = (info.resources || []).filter((x) => x.download_url);
    const audio = all.filter((x) => x.type === 'audio');
    const pool = audio.length ? audio : all;
    if (!pool.length) {
      last = 'tidak ada resource audio';
      continue;
    }
    const rank = (q?: string) => {
      const i = QUALITY_ORDER.indexOf(q || '');
      return i === -1 ? 99 : i;
    };
    pool.sort((a, b) => rank(a.quality) - rank(b.quality));
    return pool[0].download_url as string;
  }
  throw new Error(last || 'vidssave gagal');
}
