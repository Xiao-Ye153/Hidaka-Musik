import type { Track } from './tracks';

type RawTrack = { id: string; title: string; channel?: string; thumb?: string };

const mem = new Map<string, Track[]>();

export async function searchTracks(q: string, max = 12, signal?: AbortSignal): Promise<Track[]> {
  const key = `${q}|${max}`;
  const hit = mem.get(key);
  if (hit) return hit;
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&max=${max}`, { signal });
  const data = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(data)) {
    throw new Error((data && data.error) || 'Pencarian gagal');
  }
  const tracks = (data as RawTrack[]).map((r) => ({
    id: r.id,
    title: r.title,
    artist: r.channel || '',
    thumb: r.thumb
  }));
  mem.set(key, tracks);
  return tracks;
}

export function hiRes(url?: string) {
  return url ? url.replace(/=w\d+-h\d+/, '=w600-h600') : url;
}

export function cleanArtistName(n: string) {
  return n
    .replace(/VEVO/gi, '')
    .replace(/-\s*Topic$/i, '')
    .replace(/Official/gi, '')
    .replace(/Music/gi, '')
    .trim();
}
