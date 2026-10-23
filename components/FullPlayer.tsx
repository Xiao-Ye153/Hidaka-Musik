'use client';

import '../app/player.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  Download,
  Heart,
  ListMusic,
  ListPlus,
  Loader2,
  MessageSquare,
  Moon,
  Pause,
  Pencil,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  User
} from 'lucide-react';
import { cleanArtistName, hiRes, searchTracks } from '@/lib/api';
import { getArtistBio } from '@/lib/bio';
import { fetchLyrics, type Lyrics } from '@/lib/lyrics';
import type { Track } from '@/lib/tracks';
import { useAuth } from './AuthProvider';
import { useExtras } from './Extras';
import { usePlayer, useProgress } from './Providers';
import TrackThumb from './TrackThumb';
import { useI18n } from '@/components/I18nProvider';

type View = 'art' | 'lyrics' | 'queue';

const lyricCache = new Map<string, Lyrics | null>();

function fmt(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

export default function FullPlayer() {
  const { t: tr } = useI18n();
  const { fullOpen } = useExtras();
  const { current } = usePlayer();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (fullOpen) {
      setShown(true);
      return;
    }
    const id = setTimeout(() => setShown(false), 500);
    return () => clearTimeout(id);
  }, [fullOpen]);

  return (
    <div className={`full${fullOpen && current ? ' open' : ''}`} role="dialog" aria-label={tr("Pemutar")}>
      {shown && current ? <FullBody track={current} /> : null}
    </div>
  );
}

function Marquee({ text }: { text: string }) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const seg = useRef<HTMLSpanElement | null>(null);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    setDur(0);
    const id = requestAnimationFrame(() => {
      const w = wrap.current;
      const s = seg.current;
      if (!w || !s) return;
      if (s.scrollWidth > w.clientWidth) setDur(Math.max(8, (s.scrollWidth + 60) / 40));
    });
    return () => cancelAnimationFrame(id);
  }, [text]);

  return (
    <div className="mq-wrap" ref={wrap}>
      <span className={`mq${dur ? ' on' : ''}`} style={dur ? { animationDuration: `${dur}s` } : undefined}>
        <span className="mq-seg" ref={seg}>
          {text}
        </span>
        {dur ? <span className="mq-seg">{text}</span> : null}
      </span>
    </div>
  );
}

function FullBody({ track }: { track: Track }) {
  const { t: tr, lang } = useI18n();
  const { queue, playing, buffering, engine, engineNote, repeat, toggle, next, prev, seek, toggleRepeat, isLiked, toggleLike, play } =
    usePlayer();
  const { time, duration } = useProgress();
  const { closeFull, sleepEnd, setSleep, openPicker, openComments, isFollowing, toggleArtist } = useExtras();
  const { user } = useAuth();

  const [view, setView] = useState<View>('art');
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [lyState, setLyState] = useState<'idle' | 'loading' | 'none' | 'ok'>('idle');
  const [dlBusy, setDlBusy] = useState(false);
  const [note, setNote] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const userTs = useRef(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [bio, setBio] = useState('');
  const [bioState, setBioState] = useState<'idle' | 'loading' | 'ok' | 'none'>('idle');
  const [bioOpen, setBioOpen] = useState(false);
  const [explore, setExplore] = useState<Track[]>([]);
  const firstScroll = useRef(true);

  useEffect(() => {
    setLyrics(null);
    setLyState('idle');
  }, [track.id]);

  useEffect(() => {
    if (view !== 'lyrics') return;
    if (lyricCache.has(track.id)) {
      const cached = lyricCache.get(track.id) ?? null;
      setLyrics(cached);
      setLyState(cached ? 'ok' : 'none');
      return;
    }
    const ctl = new AbortController();
    setLyState('loading');
    fetchLyrics(track.title, track.artist, duration, ctl.signal)
      .then((r) => {
        lyricCache.set(track.id, r);
        setLyrics(r);
        setLyState(r ? 'ok' : 'none');
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setLyState('none');
      });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, track.id]);

  const synced = lyrics?.synced ?? [];
  const isSynced = synced.length > 0;
  const lines = useMemo<string[]>(
    () =>
      lyrics
        ? lyrics.synced.length > 0
          ? lyrics.synced.map((l) => l.text || '♪')
          : lyrics.plain
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean)
        : [],
    [lyrics]
  );

  let active = 0;
  if (isSynced) {
    for (let i = 0; i < synced.length; i++) {
      if (synced[i].t <= time) active = i;
      else break;
    }
  } else if (lines.length > 0 && duration > 0) {
    active = Math.min(Math.floor((time / duration) * lines.length), lines.length - 1);
  }

  const seekLine = (i: number) => {
    if (isSynced) seek(synced[i].t);
    else if (lines.length > 0 && duration > 0) seek((i / lines.length) * duration);
  };

  const lineEls = useMemo(
    () =>
      lines.map((txt, i) => {
        const d = i - active;
        const cls = d === 0 ? 'active' : d === -1 ? 'prev1' : d === -2 ? 'prev2' : d === 1 ? 'next1' : d === 2 ? 'next2' : '';
        return (
          <div
            key={i}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            className={`lyrics-line ${cls}`}
            onClick={() => seekLine(i)}
          >
            {txt}
          </div>
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, active, isSynced]
  );

  useEffect(() => {
    if (view === 'lyrics') firstScroll.current = true;
  }, [view, track.id]);

  useEffect(() => {
    if (view !== 'lyrics') return;
    const sc = scrollRef.current;
    const el = lineRefs.current[active];
    if (!sc || !el) return;
    if (!firstScroll.current && Date.now() - userTs.current < 2500) return;
    const sr = sc.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    sc.scrollTo({
      top: sc.scrollTop + (er.top - sr.top) - sc.clientHeight / 2 + el.offsetHeight / 2,
      behavior: firstScroll.current ? 'auto' : 'smooth'
    });
    firstScroll.current = false;
  }, [active, view, lyState, lines.length]);

  useEffect(() => {
    if (!track.artist) return;
    let off = false;
    const clean = cleanArtistName(track.artist) || track.artist;
    setBioState('loading');
    setBio('');
    setBioOpen(false);
    setExplore([]);
    getArtistBio(clean, user?.uid ?? null, lang)
      .then((b) => {
        if (off) return;
        setBio(b);
        setBioState(b ? 'ok' : 'none');
      })
      .catch(() => !off && setBioState('none'));
    searchTracks(`${clean} official music`, 8)
      .then((r) => !off && setExplore(r))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [track.artist, user?.uid, lang]);

  useEffect(() => {
    if (view === 'queue') {
      const id = setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      return () => clearTimeout(id);
    }
  }, [view]);

  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(''), 2600);
    return () => clearTimeout(id);
  }, [note]);

  const download = () => {
    if (dlBusy) return;
    setDlBusy(true);
    window.open(
      `/api/stream?id=${encodeURIComponent(track.id)}&q=128&dl=1&name=${encodeURIComponent(track.title)}`,
      '_blank',
      'noopener'
    );
    setNote(tr("Unduhan dibuka di tab baru"));
    setTimeout(() => setDlBusy(false), 1500);
  };

  const cycleSleep = () => {
    const order = [0, 15, 30, 60];
    let cur = 0;
    if (sleepEnd) {
      const left = Math.round((sleepEnd - Date.now()) / 60000);
      cur = left > 30 ? 60 : left > 15 ? 30 : 15;
    }
    const n = order[(order.indexOf(cur) + 1) % order.length];
    setSleep(n);
    setNote(n ? tr('Timer tidur {n} menit', { n }) : tr('Timer tidur dimatikan'));
  };

  const toggleView = (v: View) => setView((cur) => (cur === v ? 'art' : v));
  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  const liked = isLiked(track.id);

  return (
    <div className="full-inner">
      <div className="full-head">
        <button type="button" className="full-ib" onClick={closeFull} aria-label={tr("Tutup")}>
          <ChevronDown size={24} />
        </button>
        <b>{tr("Sedang diputar")}</b>
        <button type="button" className="full-ib" onClick={() => openPicker(track)} aria-label={tr("Simpan ke playlist")}>
          <ListPlus size={22} />
        </button>
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, opacity: 0.75, padding: '0 16px 4px' }}>
        {engine === 'audio' ? 'Mesin: audio (bisa di background)' : `Mesin: YouTube (mati di background) — ${engineNote}`}
      </div>

      <div className="full-scroll">
      <div className="full-stage">
          <div className={`swap${view === 'lyrics' ? ' show-lyrics' : ''}`}>
            <TrackThumb track={track} className="full-art" hires />
            <div className="swap-lyrics">
              <div className="lyrics-box">
                {(lyState === 'loading' || lyState === 'idle') && (
                  <div className="lyrics-loading">
                    <div className="spin" />
                    <span>{tr("Memuat lirik...")}</span>
                  </div>
                )}
                {lyState === 'none' && (
                  <div className="lyrics-loading">
                    <span style={{ fontSize: 15 }}>
                      {tr("Lirik tidak tersedia 😔")}
                      <br />
                      <span style={{ fontSize: 12 }}>{tr("Coba lagu berbeda")}</span>
                    </span>
                  </div>
                )}
                {lyState === 'ok' && lines.length > 0 && (
                  <div className="lyrics-wrap">
                    <div
                      className="lyrics-scroll-inner"
                      ref={scrollRef}
                      onTouchStart={() => (userTs.current = Date.now())}
                      onWheel={() => (userTs.current = Date.now())}
                      onPointerDown={() => (userTs.current = Date.now())}
                    >
                      {lineEls}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
      </div>

      <div className="full-info">
        <div className="t">
          <div className="full-title">
            <Marquee text={track.title} />
          </div>
          {track.artist ? (
            <Link href={`/artist?name=${encodeURIComponent(track.artist)}`} className="full-artist" onClick={closeFull}>
              {track.artist}
            </Link>
          ) : null}
        </div>
        <button type="button" className={`full-ib${liked ? ' liked-on' : ''}`} onClick={() => toggleLike(track)} aria-label={tr("Suka")}>
          <Heart size={22} fill={liked ? 'currentColor' : 'none'} />
        </button>
      </div>

      <input
        className="seek"
        type="range"
        min={0}
        max={duration > 0 ? duration : 1}
        step={0.5}
        value={Math.min(time, duration > 0 ? duration : 1)}
        onChange={(e) => seek(Number(e.target.value))}
        style={{ ['--p' as string]: `${pct}%` }}
        aria-label={tr("Posisi lagu")}
      />
      <div className="times">
        <span>{fmt(time)}</span>
        <span>{fmt(duration)}</span>
      </div>

      <div className="full-ctrl">
        <button type="button" className={`fc${repeat ? ' on' : ''}`} onClick={toggleRepeat} aria-label={tr("Ulangi")}>
          <Repeat size={22} />
        </button>
        <button type="button" className="fc" onClick={prev} aria-label={tr("Sebelumnya")}>
          <SkipBack size={26} fill="currentColor" />
        </button>
        <button type="button" className="fc main" onClick={toggle} aria-label={playing ? 'Jeda' : tr('Putar')}>
          {buffering ? (
            <Loader2 size={30} style={{ animation: 'spin 1s linear infinite' }} />
          ) : playing ? (
            <Pause size={30} fill="currentColor" />
          ) : (
            <Play size={30} fill="currentColor" />
          )}
        </button>
        <button type="button" className="fc" onClick={next} aria-label={tr("Berikutnya")}>
          <SkipForward size={26} fill="currentColor" />
        </button>
        <button type="button" className={`fc${sleepEnd ? ' on' : ''}`} onClick={cycleSleep} aria-label={tr("Timer tidur")}>
          <Moon size={22} />
        </button>
      </div>

      <div className="full-actions">
        <button type="button" className="fa" onClick={() => openPicker(track)}>
          <ListPlus size={18} />
          {tr("Playlist")}
        </button>
        <button type="button" className="fa" onClick={download} disabled={dlBusy}>
          {dlBusy ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={18} />}
          Unduh
        </button>
      </div>

      {note ? (
        <p className="stage-msg" style={{ marginTop: 10, fontSize: 14 }}>
          {note}
        </p>
      ) : null}

      {view === 'art' && (
        <div className="ta-wrap">
          <div className="ta-line" />
          <div className="ta-label">{tr("Tentang Artis")}</div>
          <Link href={`/artist?name=${encodeURIComponent(track.artist)}`} className="ta-banner" onClick={closeFull}>
            {track.thumb ? <img src={hiRes(track.thumb)} alt="" /> : null}
            <span className="ov" />
            <span className="nm">{track.artist}</span>
            <span className="go">
              <ChevronRight size={16} />
            </span>
          </Link>
          <div className="ta-bio">
            {bioState === 'loading' && (
              <div className="t" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spin" style={{ width: 14, height: 14, borderWidth: 2 }} />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{tr("Memuat info artis...")}</span>
              </div>
            )}
            {bioState === 'none' && <div className="t">{tr("Info artis tidak tersedia.")}</div>}
            {bioState === 'ok' && (
              <>
                <div className={`t${bioOpen ? '' : ' clamp'}`}>{bio}</div>
                <button type="button" className="ta-more" onClick={() => setBioOpen((o) => !o)}>
                  {bioOpen ? 'Tampilkan lebih sedikit' : tr('Tampilkan lebih banyak')}
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            className={`ta-sub${isFollowing(track.artist) ? ' on' : ''}`}
            onClick={() => toggleArtist(track.artist)}
          >
            {isFollowing(track.artist) ? '✓ Subscribed' : tr('Subscribe')}
          </button>
          {explore.length > 0 && (
            <>
              <div className="ta-ex-title">Jelajahi {cleanArtistName(track.artist) || track.artist}</div>
              <div className="ta-ex">
                {explore.map((t) => (
                  <button key={t.id} type="button" className="ta-card" onClick={() => play(t, explore)}>
                    <TrackThumb track={t} className="im" />
                    <div className="tt">{t.title}</div>
                    <div className="ch">{t.artist}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {view === 'queue' && (
        <div ref={panelRef} className="un-wrap">
          <div className="un-head">{tr("Up Next")}</div>
          <div className="un-list">
            {queue.length === 0 && <div className="un-empty">{tr("Belum ada antrian")}</div>}
            {queue.map((t, i) => {
              const now = t.id === track.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`un-item${now ? ' playing' : ''}`}
                  onClick={() => {
                    play(t, queue);
                    setView('art');
                  }}
                >
                  <div className="un-num">
                    {now ? (
                      <div className="eq">
                        <span />
                        <span />
                        <span />
                      </div>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <TrackThumb track={t} className="un-thumb" />
                  <div className="un-info">
                    <div className="un-t">{t.title}</div>
                    <div className="un-ch">{t.artist}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      </div>

      <div className="full-tabs">
        <button type="button" className={`btab${view === 'queue' ? ' active' : ''}`} onClick={() => toggleView('queue')}>
          <ListMusic />
          {tr("Up next")}
        </button>
        <button type="button" className={`btab${view === 'lyrics' ? ' active' : ''}`} onClick={() => toggleView('lyrics')}>
          <Pencil />
          {tr("Lyrics")}
        </button>
        <button type="button" className="btab" onClick={openComments}>
          <MessageSquare />
          {tr("Komentar")}
        </button>
        <Link href={`/artist?name=${encodeURIComponent(track.artist)}`} className="btab" onClick={closeFull}>
          <User />
          {tr("Lihat artis")}
        </Link>
      </div>
    </div>
  );
}
