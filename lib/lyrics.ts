export type LyricLine = { t: number; text: string };

export type Lyrics = { synced: LyricLine[]; plain: string };

type LrcItem = {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  duration?: number;
};

export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split('\n')) {
    const m = raw.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    if (m) lines.push({ t: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim() });
  }
  return lines;
}

export async function fetchLyrics(
  track: { id: string; title: string; artist: string },
  signal?: AbortSignal
): Promise<Lyrics | null> {
  const clean = track.title.replace(/\(.*?\)|\[.*?\]/g, '').trim() || track.title;
  const res = await fetch(
    `/api/lyrics?id=${encodeURIComponent(track.id)}&title=${encodeURIComponent(clean)}&artist=${encodeURIComponent(track.artist)}`,
    { signal }
  );
  const data = await res.json().catch(() => null);
  const synced: LyricLine[] = Array.isArray(data?.synced) ? data.synced : [];
  const plain: string = typeof data?.plain === 'string' ? data.plain : '';
  if (synced.length === 0 && !plain) return null;
  return { synced, plain };
}
