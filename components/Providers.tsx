'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { THEME_KEY, type ThemeId } from '@/lib/themes';
import type { Track } from '@/lib/tracks';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

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
  buffering: boolean;
  engine: 'audio' | 'yt';
  repeat: boolean;
  liked: Track[];
  recent: Track[];
  isLiked: (id: string) => boolean;
  toggleLike: (t: Track) => void;
  setLikedAll: (t: Track[]) => void;
  setRecentAll: (t: Track[]) => void;
  play: (t: Track, q?: Track[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  close: () => void;
  seek: (sec: number) => void;
  toggleRepeat: () => void;
};

type ProgressCtx = { time: number; duration: number };

const ThemeContext = createContext<ThemeCtx | null>(null);
const PlayerContext = createContext<PlayerCtx | null>(null);
const ProgressContext = createContext<ProgressCtx>({ time: 0, duration: 0 });

const urlCache = new Map<string, { url: string; at: number }>();

function peekUrl(id: string): string | null {
  const hit = urlCache.get(id);
  return hit && Date.now() - hit.at < 4 * 60 * 1000 ? hit.url : null;
}

async function resolveUrl(id: string): Promise<string> {
  const hit = urlCache.get(id);
  if (hit && Date.now() - hit.at < 4 * 60 * 1000) return hit.url;
  let lastErr: unknown = new Error('gagal');
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(`/api/audio?id=${encodeURIComponent(id)}`);
      const d = await r.json();
      if (d?.url) {
        urlCache.set(id, { url: d.url, at: Date.now() });
        return d.url as string;
      }
      lastErr = new Error(d?.error || 'tanpa link');
    } catch (e) {
      lastErr = e;
    }
    await new Promise((res) => setTimeout(res, 500));
  }
  throw lastErr;
}

const LIKED_KEY = 'nada_liked';
const RECENT_KEY = 'hm_recent';

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

export function useProgress() {
  return useContext(ProgressContext);
}

export default function Providers({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('sea');
  const [sheetOpen, setSheetOpen] = useState(false);

  const [current, setCurrent] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [liked, setLiked] = useState<Track[]>([]);
  const [recent, setRecent] = useState<Track[]>([]);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const ytRef = useRef<any>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<string | null>(null);
  const currentRef = useRef<Track | null>(null);
  const queueRef = useRef<Track[]>([]);
  const repeatRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const engineRef = useRef<'audio' | 'yt'>('audio');
  const reqRef = useRef(0);
  const prefetchedRef = useRef('');
  const ensureYTRef = useRef<() => void>(() => {});
  const stepRef = useRef<(dir: 1 | -1, auto: boolean) => void>(() => {});
  const fallbackRef = useRef<(t: Track) => void>(() => {});
  const [engine, setEngine] = useState<'audio' | 'yt'>('audio');

  useEffect(() => {
    const saved = document.documentElement.getAttribute('data-theme') as ThemeId | null;
    if (saved) setThemeState(saved);
    try {
      const l = localStorage.getItem(LIKED_KEY);
      if (l) setLiked(JSON.parse(l));
      const r = localStorage.getItem(RECENT_KEY);
      if (r) setRecent(JSON.parse(r));
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

  const setLikedAll = useCallback((t: Track[]) => {
    setLiked(t);
    try {
      localStorage.setItem(LIKED_KEY, JSON.stringify(t));
    } catch {}
  }, []);

  const setRecentAll = useCallback((t: Track[]) => {
    setRecent(t);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(t));
    } catch {}
  }, []);

  const pushRecent = useCallback((t: Track) => {
    setRecent((prev) => {
      const next = [t, ...prev.filter((x) => x.id !== t.id)].slice(0, 20);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const fallbackYT = useCallback((t: Track) => {
    engineRef.current = 'yt';
    setEngine('yt');
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute('src');
      a.load();
    }
    if (readyRef.current && ytRef.current) {
      ytRef.current.loadVideoById(t.id);
    } else {
      pendingRef.current = t.id;
      ensureYTRef.current();
    }
  }, []);

  const loadTrack = useCallback(
    (t: Track) => {
      currentRef.current = t;
      setCurrent(t);
      setTime(0);
      setDuration(0);
      setBuffering(true);
      pushRecent(t);
      const rid = ++reqRef.current;
      engineRef.current = 'audio';
      setEngine('audio');
      pendingRef.current = null;
      if (ytRef.current && readyRef.current) {
        try {
          ytRef.current.pauseVideo();
        } catch {}
      }
      const a = audioRef.current;
      if (!a) {
        fallbackYT(t);
        return;
      }
      const onFail = (e: { name?: string }) => {
        if (rid !== reqRef.current) return;
        if (e?.name === 'NotAllowedError') {
          setBuffering(false);
          setPlaying(false);
          return;
        }
        fallbackYT(t);
      };
      // Jalur sinkron: URL sudah di-prefetch, langsung play tanpa fetch.
      // Penting di latar belakang: browser mem-freeze tab yang sunyi + menunggu async.
      const cached = peekUrl(t.id);
      if (cached) {
        a.src = cached;
        a.play().catch(onFail);
        return;
      }
      if (!document.hidden) a.pause();
      resolveUrl(t.id)
        .then((url) => {
          if (rid !== reqRef.current) return;
          a.src = url;
          return a.play();
        })
        .catch(onFail);
    },
    [pushRecent, fallbackYT]
  );

  const play = useCallback(
    (t: Track, q?: Track[]) => {
      if (q) {
        queueRef.current = q;
        setQueue(q);
      }
      loadTrack(t);
    },
    [loadTrack]
  );

  const step = useCallback(
    (dir: 1 | -1, auto: boolean) => {
      const q = queueRef.current;
      const c = currentRef.current;
      if (!c || q.length === 0) return;
      if (dir === -1) {
        if (engineRef.current === 'audio') {
          const a = audioRef.current;
          if (a && a.currentTime > 3) {
            a.currentTime = 0;
            return;
          }
        } else {
          const p = ytRef.current;
          if (p && readyRef.current && p.getCurrentTime && p.getCurrentTime() > 3) {
            p.seekTo(0, true);
            return;
          }
        }
      }
      const i = q.findIndex((x) => x.id === c.id);
      let n = i + dir;
      if (n < 0) n = 0;
      if (n >= q.length) {
        if (auto) {
          setPlaying(false);
          return;
        }
        n = 0;
      }
      loadTrack(q[n]);
    },
    [loadTrack]
  );

  stepRef.current = step;
  fallbackRef.current = fallbackYT;

  useEffect(() => {
    const a = new Audio();
    a.preload = 'auto';
    a.setAttribute('playsinline', '');
    a.style.display = 'none';
    document.body.appendChild(a);
    audioRef.current = a;
    const onPlaying = () => {
      if (engineRef.current !== 'audio') return;
      setPlaying(true);
      setBuffering(false);
    };
    const onPause = () => {
      if (engineRef.current !== 'audio') return;
      if (!a.ended) setPlaying(false);
    };
    const onWaiting = () => {
      if (engineRef.current === 'audio') setBuffering(true);
    };
    const onCanPlay = () => {
      if (engineRef.current === 'audio') setBuffering(false);
    };
    const onTime = () => {
      if (engineRef.current !== 'audio') return;
      setTime(a.currentTime);
      // Prefetch lagu berikutnya ~45 detik sebelum habis supaya link masih segar
      if (isFinite(a.duration) && a.duration - a.currentTime < 45) {
        const q = queueRef.current;
        const c = currentRef.current;
        if (!c || prefetchedRef.current === c.id) return;
        const n = q[q.findIndex((x) => x.id === c.id) + 1];
        if (n) {
          prefetchedRef.current = c.id;
          resolveUrl(n.id).catch(() => {
            prefetchedRef.current = '';
          });
        }
      }
    };
    const onMeta = () => {
      if (engineRef.current === 'audio' && isFinite(a.duration)) setDuration(a.duration);
    };
    const onEnded = () => {
      if (engineRef.current !== 'audio') return;
      if (repeatRef.current) {
        a.currentTime = 0;
        a.play().catch(() => {});
      } else {
        stepRef.current(1, true);
      }
    };
    const onError = () => {
      if (engineRef.current !== 'audio' || !a.getAttribute('src')) return;
      const t = currentRef.current;
      if (t) fallbackRef.current(t);
    };
    a.addEventListener('playing', onPlaying);
    a.addEventListener('pause', onPause);
    a.addEventListener('waiting', onWaiting);
    a.addEventListener('canplay', onCanPlay);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('durationchange', onMeta);
    a.addEventListener('ended', onEnded);
    a.addEventListener('error', onError);
    return () => {
      a.removeEventListener('playing', onPlaying);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('waiting', onWaiting);
      a.removeEventListener('canplay', onCanPlay);
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('durationchange', onMeta);
      a.removeEventListener('ended', onEnded);
      a.removeEventListener('error', onError);
      a.pause();
      a.remove();
    };
  }, []);

  const ensureYT = useCallback(() => {
    const make = () => {
      if (ytRef.current || !window.YT || !window.YT.Player) return;
      ytRef.current = new window.YT.Player('yt-host', {
        height: '1',
        width: '1',
        playerVars: { playsinline: 1, controls: 0, disablekb: 1, fs: 0, rel: 0, origin: window.location.origin },
        events: {
          onReady: () => {
            readyRef.current = true;
            if (pendingRef.current) {
              ytRef.current.loadVideoById(pendingRef.current);
              pendingRef.current = null;
            }
          },
          onStateChange: (e: { data: number }) => {
            const S = window.YT.PlayerState;
            if (e.data === S.PLAYING) {
              setPlaying(true);
              setBuffering(false);
              const d = ytRef.current.getDuration?.() || 0;
              if (d) setDuration(d);
            } else if (e.data === S.BUFFERING) {
              setBuffering(true);
            } else if (e.data === S.PAUSED) {
              setPlaying(false);
              setBuffering(false);
            } else if (e.data === S.ENDED) {
              setBuffering(false);
              if (repeatRef.current) {
                ytRef.current.seekTo(0, true);
                ytRef.current.playVideo();
              } else {
                stepRef.current(1, true);
              }
            }
          },
          onError: () => {
            setBuffering(false);
            stepRef.current(1, true);
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      make();
    } else {
      window.onYouTubeIframeAPIReady = make;
      if (!document.getElementById('yt-api')) {
        const s = document.createElement('script');
        s.id = 'yt-api';
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      }
    }
  }, []);
  ensureYTRef.current = ensureYT;

  useEffect(() => {
    if (!playing || engine !== 'yt') return;
    const id = setInterval(() => {
      const p = ytRef.current;
      if (!p || !readyRef.current || !p.getCurrentTime) return;
      setTime(p.getCurrentTime() || 0);
      const d = p.getDuration?.() || 0;
      if (d) setDuration(d);
    }, 500);
    return () => clearInterval(id);
  }, [playing, engine]);

  const toggle = useCallback(() => {
    if (engineRef.current === 'audio') {
      const a = audioRef.current;
      if (!a) return;
      if (a.paused) a.play().catch(() => {});
      else a.pause();
      return;
    }
    const p = ytRef.current;
    if (!p || !readyRef.current) return;
    if (p.getPlayerState() === 1) p.pauseVideo();
    else p.playVideo();
  }, []);

  const next = useCallback(() => step(1, false), [step]);
  const prev = useCallback(() => step(-1, false), [step]);

  const close = useCallback(() => {
    reqRef.current++;
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute('src');
      a.load();
    }
    const p = ytRef.current;
    if (p && readyRef.current) p.stopVideo();
    currentRef.current = null;
    setCurrent(null);
    setPlaying(false);
    setBuffering(false);
    setTime(0);
    setDuration(0);
  }, []);

  const seek = useCallback((sec: number) => {
    if (engineRef.current === 'audio') {
      const a = audioRef.current;
      if (a) a.currentTime = sec;
      setTime(sec);
      return;
    }
    const p = ytRef.current;
    if (!p || !readyRef.current) return;
    p.seekTo(sec, true);
    setTime(sec);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeat((r) => {
      repeatRef.current = !r;
      return !r;
    });
  }, []);

  useEffect(() => {
    if (!current || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist,
        artwork: current.thumb ? [{ src: current.thumb, sizes: '512x512', type: 'image/jpeg' }] : []
      });
      navigator.mediaSession.setActionHandler('play', () => {
        if (engineRef.current === 'audio') audioRef.current?.play().catch(() => {});
        else ytRef.current?.playVideo();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (engineRef.current === 'audio') audioRef.current?.pause();
        else ytRef.current?.pauseVideo();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => stepRef.current(-1, false));
      navigator.mediaSession.setActionHandler('nexttrack', () => stepRef.current(1, false));
      navigator.mediaSession.setActionHandler('seekto', (d) => {
        if (d.seekTime != null && engineRef.current === 'audio' && audioRef.current) audioRef.current.currentTime = d.seekTime;
      });
    } catch {}
  }, [current]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    } catch {}
  }, [playing]);

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
      buffering,
      engine,
      repeat,
      liked,
      recent,
      isLiked: (id) => liked.some((x) => x.id === id),
      toggleLike,
      setLikedAll,
      setRecentAll,
      play,
      toggle,
      next,
      prev,
      close,
      seek,
      toggleRepeat
    }),
    [current, queue, playing, buffering, engine, repeat, liked, recent, toggleLike, setLikedAll, setRecentAll, play, toggle, next, prev, close, seek, toggleRepeat]
  );

  const progressValue = useMemo<ProgressCtx>(() => ({ time, duration }), [time, duration]);

  return (
    <ThemeContext.Provider value={themeValue}>
      <PlayerContext.Provider value={playerValue}>
        <ProgressContext.Provider value={progressValue}>
          <div
            aria-hidden="true"
            style={{ position: 'fixed', right: 0, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none', overflow: 'hidden' }}
          >
            <div id="yt-host" />
          </div>
          {children}
        </ProgressContext.Provider>
      </PlayerContext.Provider>
    </ThemeContext.Provider>
  );
}
