'use client';

import '../app/player.css';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Download,
  Heart,
  ListMusic,
  ListPlus,
  Loader2,
  Moon,
  Pause,
  Pencil,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  User
} from 'lucide-react';
import { fetchLyrics, type Lyrics } from '@/lib/lyrics';
import { useExtras } from './Extras';
import { usePlayer, useProgress } from './Providers';
import TrackThumb from './TrackThumb';

type View = 'art' | 'lyrics' | 'queue';

function fmt(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

export default function FullPlayer() {
  const { current, queue, playing, buffering, engine, repeat, toggle, next, prev, seek, toggleRepeat, isLiked, toggleLike, play } =
    usePlayer();
  const { time, duration } = useProgress();
  const { fullOpen, closeFull, sleepEnd, setSleep, openPicker } = useExtras();

  const [view, setView] = useState<View>('art');
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [lyState, setLyState] = useState<'idle' | 'loading' | 'none' | 'ok'>('idle');
  const [dlBusy, setDlBusy] = useState(false);
  const [note, setNote] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cache = useRef<Map<string, Lyrics | null>>(new Map());

  useEffect(() => {
    setLyrics(null);
    setLyState('idle');
  }, [current?.id]);

  useEffect(() => {
    if (view !== 'lyrics' || !current) return;
    if (cache.current.has(current.id)) {
      const cached = cache.current.get(current.id) ?? null;
      setLyrics(cached);
      setLyState(cached ? 'ok' : 'none');
      return;
    }
    const ctl = new AbortController();
    setLyState('loading');
    fetchLyrics(current.title, current.artist, duration, ctl.signal)
      .then((r) => {
        cache.current.set(current.id, r);
        setLyrics(r);
        setLyState(r ? 'ok' : 'none');
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setLyState('none');
      });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, current?.id]);

  const synced = lyrics?.synced ?? [];
  const isSynced = synced.length > 0;
  const lines: string[] = isSynced
    ? synced.map((l) => l.text || '♪')
    : (lyrics?.plain ?? '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

  let active = 0;
  if (isSynced) {
    for (let i = 0; i < synced.length; i++) {
      if (synced[i].t <= time) active = i;
      else break;
    }
  } else if (lines.length > 0 && duration > 0) {
    active = Math.min(Math.floor((time / duration) * lines.length), lines.length - 1);
  }

  useEffect(() => {
    if (view !== 'lyrics') return;
    const sc = scrollRef.current;
    const el = lineRefs.current[active];
    if (!sc || !el) return;
    sc.scrollTo({ top: el.offsetTop - sc.clientHeight / 2 + el.offsetHeight / 2, behavior: 'smooth' });
  }, [active, view, lyState, lines.length]);

  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(''), 2600);
    return () => clearTimeout(id);
  }, [note]);

  const seekLine = (i: number) => {
    if (isSynced) seek(synced[i].t);
    else if (lines.length > 0 && duration > 0) seek((i / lines.length) * duration);
  };

  const download = async () => {
    if (!current || dlBusy) return;
    setDlBusy(true);
    try {
      const r = await fetch(`/api/audio?id=${encodeURIComponent(current.id)}&q=128`);
      const d = await r.json();
      if (!d?.url) throw new Error('kosong');
      window.open(d.url, '_blank', 'noopener');
      setNote('Unduhan dibuka di tab baru');
    } catch {
      setNote('Gagal mengambil link unduhan');
    }
    setDlBusy(false);
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
    setNote(n ? `Timer tidur ${n} menit` : 'Timer tidur dimatikan');
  };

  const toggleView = (v: View) => setView((cur) => (cur === v ? 'art' : v));

  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  const liked = current ? isLiked(current.id) : false;

  return (
    <div className={`full${fullOpen && current ? ' open' : ''}`} role="dialog" aria-label="Pemutar">
      {current ? (
        <div className="full-inner">
          <div className="full-head">
            <button type="button" className="full-ib" onClick={closeFull} aria-label="Tutup">
              <ChevronDown size={24} />
            </button>
            <b>
              Sedang diputar
              <span style={{ display: 'block', marginTop: 2, fontSize: 10, letterSpacing: 1, textTransform: 'none', color: 'var(--muted)' }}>
                {engine === 'audio' ? 'via SaveTube' : 'via YouTube (berhenti saat layar mati)'}
              </span>
            </b>
            <button type="button" className="full-ib" onClick={() => openPicker(current)} aria-label="Simpan ke playlist">
              <ListPlus size={22} />
            </button>
          </div>

          <div className="full-stage">
            {view === 'queue' ? (
              <div className="queue">
                {queue.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`qrow${t.id === current.id ? ' now' : ''}`}
                    onClick={() => play(t, queue)}
                  >
                    <TrackThumb track={t} className="thumb" />
                    <span className="row-body">
                      <span className="row-title" style={{ display: 'block' }}>
                        {t.title}
                      </span>
                      <span className="row-sub" style={{ display: 'block' }}>
                        {t.artist}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className={`swap${view === 'lyrics' ? ' show-lyrics' : ''}`}>
                <TrackThumb track={current} className="full-art" hires />
                <div className="swap-lyrics">
                  <div className="lyrics-box">
                    {(lyState === 'loading' || lyState === 'idle') && (
                      <div className="lyrics-loading">
                        <div className="spin" />
                        <span>Memuat lirik...</span>
                      </div>
                    )}
                    {lyState === 'none' && (
                      <div className="lyrics-loading">
                        <span style={{ fontSize: 15 }}>
                          Lirik tidak tersedia 😔
                          <br />
                          <span style={{ fontSize: 12 }}>Coba lagu berbeda</span>
                        </span>
                      </div>
                    )}
                    {lyState === 'ok' && lines.length > 0 && (
                      <>
                        <div className="lyrics-wrap">
                          <div className="lyrics-scroll-inner" ref={scrollRef}>
                            {lines.map((txt, i) => {
                              const d = i - active;
                              const cls =
                                d === 0 ? 'active' : d === -1 ? 'prev1' : d === -2 ? 'prev2' : d === 1 ? 'next1' : d === 2 ? 'next2' : '';
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
                            })}
                          </div>
                        </div>
                        <div className="lyrics-source">Lirik dari LRCLIB</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="full-info">
            <div className="t">
              <div className="full-title">{current.title}</div>
              {current.artist ? (
                <Link href={`/artist?name=${encodeURIComponent(current.artist)}`} className="full-artist" onClick={closeFull}>
                  {current.artist}
                </Link>
              ) : null}
            </div>
            <button
              type="button"
              className={`full-ib${liked ? ' liked-on' : ''}`}
              onClick={() => toggleLike(current)}
              aria-label="Suka"
            >
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
            aria-label="Posisi lagu"
          />
          <div className="times">
            <span>{fmt(time)}</span>
            <span>{fmt(duration)}</span>
          </div>

          <div className="full-ctrl">
            <button type="button" className={`fc${repeat ? ' on' : ''}`} onClick={toggleRepeat} aria-label="Ulangi">
              <Repeat size={22} />
            </button>
            <button type="button" className="fc" onClick={prev} aria-label="Sebelumnya">
              <SkipBack size={26} fill="currentColor" />
            </button>
            <button type="button" className="fc main" onClick={toggle} aria-label={playing ? 'Jeda' : 'Putar'}>
              {buffering ? (
                <Loader2 size={30} style={{ animation: 'spin 1s linear infinite' }} />
              ) : playing ? (
                <Pause size={30} fill="currentColor" />
              ) : (
                <Play size={30} fill="currentColor" />
              )}
            </button>
            <button type="button" className="fc" onClick={next} aria-label="Berikutnya">
              <SkipForward size={26} fill="currentColor" />
            </button>
            <button type="button" className={`fc${sleepEnd ? ' on' : ''}`} onClick={cycleSleep} aria-label="Timer tidur">
              <Moon size={22} />
            </button>
          </div>

          <div className="full-actions">
            <button type="button" className="fa" onClick={() => openPicker(current)}>
              <ListPlus size={18} />
              Playlist
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

          <div className="full-tabs">
            <button type="button" className={`btab${view === 'queue' ? ' active' : ''}`} onClick={() => toggleView('queue')}>
              <ListMusic />
              Up next
            </button>
            <button type="button" className={`btab${view === 'lyrics' ? ' active' : ''}`} onClick={() => toggleView('lyrics')}>
              <Pencil />
              Lyrics
            </button>
            <Link
              href={`/artist?name=${encodeURIComponent(current.artist)}`}
              className="btab"
              onClick={closeFull}
              aria-disabled={!current.artist}
            >
              <User />
              Lihat artis
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
