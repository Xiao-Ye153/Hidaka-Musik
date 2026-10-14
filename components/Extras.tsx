'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Track } from '@/lib/tracks';
import { usePlayer } from './Providers';

export type Playlist = { id: string; name: string; tracks: Track[] };

type ExtrasCtx = {
  playlists: Playlist[];
  createPlaylist: (name: string, tracks?: Track[]) => string;
  addToPlaylist: (id: string, t: Track) => void;
  removeFromPlaylist: (id: string, trackId: string) => void;
  deletePlaylist: (id: string) => void;
  setPlaylistsAll: (p: Playlist[]) => void;
  setArtistsAll: (a: string[]) => void;
  artists: string[];
  toggleArtist: (name: string) => void;
  isFollowing: (name: string) => boolean;
  fullOpen: boolean;
  openFull: () => void;
  closeFull: () => void;
  sleepEnd: number | null;
  setSleep: (minutes: number) => void;
  pickerTrack: Track | null;
  openPicker: (t: Track) => void;
  closePicker: () => void;
  commentsOpen: boolean;
  openComments: () => void;
  closeComments: () => void;
};

const Ctx = createContext<ExtrasCtx | null>(null);

const PL_KEY = 'hm_playlists';
const AR_KEY = 'hm_artists';

export function useExtras() {
  const c = useContext(Ctx);
  if (!c) throw new Error('ExtrasContext');
  return c;
}

function save(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export default function Extras({ children }: { children: ReactNode }) {
  const { playing, toggle } = usePlayer();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [artists, setArtists] = useState<string[]>([]);
  const [fullOpen, setFullOpen] = useState(false);
  const [sleepEnd, setSleepEnd] = useState<number | null>(null);
  const [pickerTrack, setPickerTrack] = useState<Track | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    try {
      const p = localStorage.getItem(PL_KEY);
      if (p) setPlaylists(JSON.parse(p));
      const a = localStorage.getItem(AR_KEY);
      if (a) setArtists(JSON.parse(a));
    } catch {}
  }, []);

  useEffect(() => {
    document.body.style.overflow = fullOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [fullOpen]);

  useEffect(() => {
    if (!sleepEnd) return;
    const id = setTimeout(() => {
      if (playingRef.current) toggle();
      setSleepEnd(null);
    }, Math.max(0, sleepEnd - Date.now()));
    return () => clearTimeout(id);
  }, [sleepEnd, toggle]);

  const updatePlaylists = useCallback((fn: (prev: Playlist[]) => Playlist[]) => {
    setPlaylists((prev) => {
      const next = fn(prev);
      save(PL_KEY, next);
      return next;
    });
  }, []);

  const createPlaylist = useCallback(
    (name: string, tracks: Track[] = []) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      updatePlaylists((prev) => [{ id, name: name.trim() || 'Playlist baru', tracks }, ...prev]);
      return id;
    },
    [updatePlaylists]
  );

  const addToPlaylist = useCallback(
    (id: string, t: Track) => {
      updatePlaylists((prev) =>
        prev.map((p) => (p.id === id && !p.tracks.some((x) => x.id === t.id) ? { ...p, tracks: [...p.tracks, t] } : p))
      );
    },
    [updatePlaylists]
  );

  const removeFromPlaylist = useCallback(
    (id: string, trackId: string) => {
      updatePlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, tracks: p.tracks.filter((x) => x.id !== trackId) } : p)));
    },
    [updatePlaylists]
  );

  const deletePlaylist = useCallback(
    (id: string) => {
      updatePlaylists((prev) => prev.filter((p) => p.id !== id));
    },
    [updatePlaylists]
  );

  const setPlaylistsAll = useCallback((p: Playlist[]) => {
    setPlaylists(p);
    save(PL_KEY, p);
  }, []);

  const setArtistsAll = useCallback((a: string[]) => {
    setArtists(a);
    save(AR_KEY, a);
  }, []);

  const toggleArtist = useCallback((name: string) => {
    setArtists((prev) => {
      const key = name.trim();
      const next = prev.includes(key) ? prev.filter((x) => x !== key) : [key, ...prev];
      save(AR_KEY, next);
      return next;
    });
  }, []);

  const setSleep = useCallback((minutes: number) => {
    setSleepEnd(minutes > 0 ? Date.now() + minutes * 60000 : null);
  }, []);

  const value = useMemo<ExtrasCtx>(
    () => ({
      playlists,
      createPlaylist,
      addToPlaylist,
      removeFromPlaylist,
      deletePlaylist,
      setPlaylistsAll,
      setArtistsAll,
      artists,
      toggleArtist,
      isFollowing: (name) => artists.includes(name.trim()),
      fullOpen,
      openFull: () => setFullOpen(true),
      closeFull: () => setFullOpen(false),
      sleepEnd,
      setSleep,
      pickerTrack,
      openPicker: (t) => setPickerTrack(t),
      closePicker: () => setPickerTrack(null),
      commentsOpen,
      openComments: () => setCommentsOpen(true),
      closeComments: () => setCommentsOpen(false)
    }),
    [playlists, createPlaylist, addToPlaylist, removeFromPlaylist, deletePlaylist, setPlaylistsAll, setArtistsAll, artists, toggleArtist, fullOpen, sleepEnd, setSleep, pickerTrack, commentsOpen]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
