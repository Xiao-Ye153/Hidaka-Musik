'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { THEME_KEY, type ThemeId } from '@/lib/themes';
import type { Track } from '@/lib/tracks';

type ThemeCtx = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
};

type PlayerCtx = {
  current: Track | null;
  queue: Track[];
  playing: boolean;
  liked: Track[];
  isLiked: (id: string) => boolean;
  toggleLike: (t: Track) => void;
  play: (t: Track, q?: Track[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  close: () => void;
};

const ThemeContext = createContext<ThemeCtx | null>(null);
const PlayerContext = createContext<PlayerCtx | null>(null);

const LIKED_KEY = 'nada_liked';

export function useTheme() {
  const c = useContext(ThemeContext);
  if (!c) throw new Error('ThemeContext');
  return c;
}

export function usePlayer() {
  const c = useContext(PlayerContext);
  if (!c) throw new Error('PlayerContext');
  return c;
}

export default function Providers({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('dark');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [current, setCurrent] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState<Track[]>([]);

  useEffect(() => {
    const saved = document.documentElement.getAttribute('data-theme') as ThemeId | null;
    if (saved) setThemeState(saved);
    try {
      const raw = localStorage.getItem(LIKED_KEY);
      if (raw) setLiked(JSON.parse(raw));
    } catch {}
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {}
    const meta = document.querySelector('meta[name="theme-color"]');
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (meta && bg) meta.setAttribute('content', bg);
  }, []);

  const toggleLike = useCallback((t: Track) => {
    setLiked((prev) => {
      const next = prev.some((x) => x.id === t.id) ? prev.filter((x) => x.id !== t.id) : [t, ...prev];
      try {
        localStorage.setItem(LIKED_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const play = useCallback((t: Track, q?: Track[]) => {
    setCurrent(t);
    if (q) setQueue(q);
    setPlaying(true);
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!current || queue.length === 0) return;
      const i = queue.findIndex((x) => x.id === current.id);
      const n = queue[(i + dir + queue.length) % queue.length];
      setCurrent(n);
      setPlaying(true);
    },
    [current, queue]
  );

  const themeValue = useMemo<ThemeCtx>(
    () => ({
      theme,
      setTheme,
      sheetOpen,
      openSheet: () => setSheetOpen(true),
      closeSheet: () => setSheetOpen(false)
    }),
    [theme, setTheme, sheetOpen]
  );

  const playerValue = useMemo<PlayerCtx>(
    () => ({
      current,
      queue,
      playing,
      liked,
      isLiked: (id) => liked.some((x) => x.id === id),
      toggleLike,
      play,
      toggle: () => setPlaying((p) => !p),
      next: () => step(1),
      prev: () => step(-1),
      close: () => {
        setPlaying(false);
        setCurrent(null);
      }
    }),
    [current, queue, playing, liked, toggleLike, play, step]
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <PlayerContext.Provider value={playerValue}>{children}</PlayerContext.Provider>
    </ThemeContext.Provider>
  );
}
