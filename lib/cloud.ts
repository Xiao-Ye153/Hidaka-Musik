import type { Playlist } from '@/components/Extras';
import type { Track } from './tracks';

type CloudTrack = { id: string; title?: string; channel?: string; artist?: string; thumb?: string };
type CloudPlaylist = { name?: string; tracks?: CloudTrack[]; createdAt?: number };
type CloudArtist = { name: string; thumb?: string; addedAt?: number };

export function parseList<T>(raw: unknown): T[] {
  if (typeof raw !== 'string') return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export const toCloudTrack = (t: Track): CloudTrack => ({
  id: t.id,
  title: t.title,
  channel: t.artist,
  artist: t.artist,
  thumb: t.thumb || ''
});

export const fromCloudTrack = (c: CloudTrack): Track => ({
  id: c.id,
  title: c.title || '',
  artist: c.channel || c.artist || '',
  thumb: c.thumb || undefined
});

export function tracksFromCloud(raw: unknown): Track[] {
  return parseList<CloudTrack>(raw)
    .filter((c) => c && c.id)
    .map(fromCloudTrack);
}

export function mergeTracks(cloud: Track[], local: Track[]): Track[] {
  const seen = new Set<string>();
  const out: Track[] = [];
  for (const t of [...cloud, ...local]) {
    if (!t.id || seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
  }
  return out;
}

export function playlistsFromCloud(raw: unknown): Playlist[] {
  return parseList<CloudPlaylist>(raw).map((p, i) => ({
    id: `c${p.createdAt ?? i}_${i}`,
    name: p.name || 'Playlist',
    tracks: (p.tracks || []).filter((c) => c && c.id).map(fromCloudTrack)
  }));
}

export function playlistsToCloud(pls: Playlist[]): CloudPlaylist[] {
  return pls.map((p) => {
    const m = p.id.match(/^c(\d+)_/);
    return { name: p.name, tracks: p.tracks.map(toCloudTrack), createdAt: m ? Number(m[1]) : Date.now() };
  });
}

export function mergePlaylists(cloud: Playlist[], local: Playlist[]): Playlist[] {
  const out = cloud.map((p) => ({ ...p, tracks: [...p.tracks] }));
  for (const lp of local) {
    const hit = out.find((p) => p.name.toLowerCase() === lp.name.toLowerCase());
    if (hit) hit.tracks = mergeTracks(hit.tracks, lp.tracks);
    else out.push(lp);
  }
  return out;
}

export function artistsFromCloud(raw: unknown): { names: string[]; meta: Record<string, CloudArtist> } {
  const list = parseList<CloudArtist>(raw).filter((a) => a && a.name);
  const meta: Record<string, CloudArtist> = {};
  list.forEach((a) => (meta[a.name] = a));
  return { names: list.map((a) => a.name), meta };
}

export function artistsToCloud(names: string[], meta: Record<string, CloudArtist>): CloudArtist[] {
  return names.map((n) => meta[n] ?? { name: n, thumb: '', addedAt: Date.now() });
}

export type { CloudArtist };
