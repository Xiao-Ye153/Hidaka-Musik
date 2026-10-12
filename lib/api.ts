import type { Track } from './tracks';

type RawTrack = { id: string; title: string; channel?: string; thumb?: string };

export async function searchTracks(q: string, max = 12, signal?: AbortSignal): Promise<Track[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&max=${max}`, { signal });
  const data = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(data)) {
    throw new Error((data && data.error) || 'Pencarian gagal');
  }
  return (data as RawTrack[]).map((r) => ({
    id: r.id,
    title: r.title,
    artist: r.channel || '',
    thumb: r.thumb
  }));
}
