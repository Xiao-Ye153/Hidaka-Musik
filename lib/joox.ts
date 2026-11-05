// Sumber musik + lirik dari Joox (scrape state Next.js di halaman web Joox). Hanya dipakai di server.
const BASE_URL = 'https://www.joox.com';

const HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};

export const CDN_HOSTS = [
  'https://id.stream.music.joox.com/',
  'https://hk.stream.music.joox.com/',
  'https://my.stream.music.joox.com/',
  'https://th.stream.music.joox.com/',
  'https://stream.music.joox.com/'
];

export type JooxTrack = { id: string; title: string; artist: string; thumb?: string; duration?: number };
export type JooxLyrics = { synced: { t: number; text: string }[]; plain: string };

const REGION = 'id';
const midCache = new Map<string, string>();

// ID Joox berbentuk base64 pendek yang diakhiri "==" (beda dengan ID YouTube 11 karakter).
export function isJooxId(id: string) {
  return id.length >= 20 && id.endsWith('==');
}

function extractNextData(html: string): any {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('Gagal baca state Next.js dari Joox');
  return JSON.parse(m[1]);
}

async function getHtml(url: string, label: string) {
  const res = await fetch(url, { headers: HEADERS, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`${label} gagal (HTTP ${res.status})`);
  return res.text();
}

function pickThumb(images: unknown): string | undefined {
  if (!Array.isArray(images) || images.length === 0) return undefined;
  const list = images
    .map((i: any) => (typeof i === 'string' ? { url: i, w: 0 } : { url: i?.url as string | undefined, w: Number(i?.width) || 0 }))
    .filter((i) => !!i.url) as { url: string; w: number }[];
  if (!list.length) return undefined;
  list.sort((a, b) => a.w - b.w);
  return (list.find((i) => i.w >= 300) || list[list.length - 1]).url;
}

function decodeEntities(s: string) {
  return s
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// Cari semua objek `song_info` di mana pun posisinya di state halaman (struktur Joox bisa berubah).
function collectSongInfos(node: any, out: any[], depth = 0) {
  if (!node || typeof node !== 'object' || depth > 10 || out.length > 200) return;
  if (Array.isArray(node)) {
    for (const n of node) collectSongInfos(n, out, depth + 1);
    return;
  }
  const si = node.song_info;
  if (si && typeof si === 'object' && si.id) out.push(si);
  for (const k of Object.keys(node)) {
    if (k === 'song_info') continue;
    collectSongInfos(node[k], out, depth + 1);
  }
}

function toTrack(s: any): JooxTrack {
  return {
    id: s.id,
    title: decodeEntities(String(s.name || '')),
    artist: ((s.artist_list || []) as any[]).map((a) => a?.name).filter(Boolean).join(', '),
    thumb: pickThumb(s.images),
    duration: Number(s.play_duration) || undefined
  };
}

export async function searchJoox(keyword: string): Promise<JooxTrack[]> {
  const html = await getHtml(`${BASE_URL}/${REGION}/search/${encodeURIComponent(keyword)}`, 'Pencarian Joox');
  const data = extractNextData(html);
  const infos: any[] = [];
  collectSongInfos(data?.props?.pageProps, infos);
  const seen = new Set<string>();
  const out: JooxTrack[] = [];
  for (const s of infos) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(toTrack(s));
  }
  return out;
}

// Dipakai ?debug=1 untuk lihat apa yang sebenarnya dikirim Joox ke server Vercel.
export async function debugSearch(keyword: string) {
  const url = `${BASE_URL}/${REGION}/search/${encodeURIComponent(keyword)}`;
  const res = await fetch(url, { headers: HEADERS, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  let pageProps: any = null;
  try {
    pageProps = m ? JSON.parse(m[1])?.props?.pageProps : null;
  } catch {}
  const infos: any[] = [];
  collectSongInfos(pageProps, infos);
  const sections = pageProps?.searchSections;
  return {
    status: res.status,
    finalUrl: res.url,
    htmlLength: html.length,
    title: (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || null,
    hasNextData: !!m,
    pagePropsKeys: pageProps ? Object.keys(pageProps) : null,
    searchSectionsKeys: sections ? Object.keys(sections) : null,
    songsKeys: sections?.songs ? Object.keys(sections.songs) : null,
    songInfoFound: infos.length,
    firstSongInfoKeys: infos[0] ? Object.keys(infos[0]) : null,
    htmlHead: m ? null : html.slice(0, 400)
  };
}

// Kalau ID bukan ID Joox (lagu lama dari YouTube / playlist impor), cari padanannya di Joox lewat judul + artis.
export async function resolveJooxId(id: string, title = '', artist = ''): Promise<string> {
  if (isJooxId(id)) return id;
  const q = `${title} ${artist}`.trim();
  if (!q) throw new Error('ID lagu tidak dikenali dan judul kosong');
  const r = await searchJoox(q);
  if (!r.length) throw new Error(`Lagu tidak ketemu di Joox: "${q}"`);
  return r[0].id;
}

async function getSingleInfo(songId: string): Promise<any> {
  const html = await getHtml(`${BASE_URL}/${REGION}/single/${encodeURIComponent(songId)}`, 'Halaman lagu Joox');
  const data = extractNextData(html);
  return data?.props?.pageProps;
}

export async function getMid(songId: string): Promise<string> {
  const hit = midCache.get(songId);
  if (hit) return hit;
  const pp = await getSingleInfo(songId);
  const mid = pp?.singleInfo?.songmid;
  if (!mid) throw new Error('songmid tidak ditemukan');
  midCache.set(songId, mid);
  return mid;
}

export async function getJooxLyrics(songId: string): Promise<JooxLyrics | null> {
  const pp = await getSingleInfo(songId);
  const raw = pp?.singleLyric;
  if (!raw) return null;
  const decoded = Buffer.from(raw, 'base64').toString('utf-8');
  const synced: { t: number; text: string }[] = [];
  for (const line of decoded.split(/\r?\n/)) {
    const m = line.match(/^\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)$/);
    if (m) synced.push({ t: parseInt(m[1], 10) * 60 + parseFloat(m[2]), text: decodeEntities(m[3].trim()) });
  }
  if (!synced.length) return null;
  return { synced, plain: synced.map((l) => l.text).join('\n') };
}

export function streamCandidates(mid: string) {
  return CDN_HOSTS.map((h) => `${h}C100${mid}.m4a`);
}

export const JOOX_HEADERS = HEADERS;
