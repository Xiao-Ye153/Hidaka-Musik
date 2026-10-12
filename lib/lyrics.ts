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
  title: string,
  artist: string,
  duration: number,
  signal?: AbortSignal
): Promise<Lyrics | null> {
  const clean = title.replace(/\(.*?\)|\[.*?\]/g, '').trim() || title;
  const res = await fetch(
    `/api/lyrics?title=${encodeURIComponent(clean)}&artist=${encodeURIComponent(artist)}`,
    { signal }
  );
  const data: LrcItem[] = await res.json().catch(() => []);
  if (!Array.isArray(data) || data.length === 0) return null;

  const synced = data.filter((d) => d.syncedLyrics);
  const pool = synced.length ? synced : data;
  let best = pool[0];
  if (duration > 0) {
    best = pool.reduce(
      (a, b) => (Math.abs((b.duration || 0) - duration) < Math.abs((a.duration || 0) - duration) ? b : a),
      pool[0]
    );
  }

  const lines = best.syncedLyrics ? parseLrc(best.syncedLyrics) : [];
  const plain = best.plainLyrics || '';
  if (lines.length === 0 && !plain) return null;
  return { synced: lines, plain };
}
