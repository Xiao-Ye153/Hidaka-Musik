'use client';

import '../app/player.css';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Download,
  Heart,
  ListPlus,
  Loader2,
  Moon,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward
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
  const { current, queue, playing, buffering, repeat, toggle, next, prev, seek, toggleRepeat, isLiked, toggleLike, play } =
    usePlayer();
  const { time, duration } = useProgress();
  const { fullOpen, closeFull, sleepEnd, setSleep, openPicker } = useExtras();

  const [view, setView] = useState<View>('art');
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [lyState, setLyState] = useState<'idle' | 'loading' | 'none' | 'ok'>('idle');
  const [dlBusy, setDlBusy] = useState(false);
  const [note, setNote] = useState('');
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const cache = useRef<Map<string, Lyrics | null>>(new Map());

  useEffect(() => {
    setLyrics(null);
    setLyState('idle');
  }, [current?.id]);

  useEffect(() => {
    if (view !== 'lyrics' || !current) return;
    const cached = cache.current.get(current.id);
    if (cache.current.has(current.id)) {
      setLyrics(cached ?? null);
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
  let active = -1;
  for (let i = 0; i < synced.length; i++) {
    if (synced[i].t <= time + 0.3) active = i;
    else break;
  }

  useEffect(() => {
    if (view === 'lyrics' && activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [active, view]);

  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(''), 2600);
    return () => clearTimeout(id);
  }, [note]);

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
            <b>Sedang diputar</b>
            <button type="button" className="full-ib" onClick={() => openPicker(current)} aria-label="Simpan ke playlist">
              <ListPlus size={22} />
            </button>
          </div>

          <div className="full-stage">
            {view === 'art' && <TrackThumb track={current} className="full-art" />}

            {view === 'lyrics' && (
              <div className="lyrics">
                {lyState === 'loading' && <p className="stage-msg">Mencari lirik...</p>}
                {lyState === 'none' && <p className="stage-msg">Lirik untuk lagu ini belum ditemukan.</p>}
                {lyState === 'ok' && synced.length > 0 &&
                  synced.map((l, i) => (
                    <button
                      key={i}
                      type="button"
                      ref={i === active ? activeRef : null}
                      className={`ly${i === active ? ' on' : ''}`}
                      onClick={() => seek(l.t)}
                    >
                      {l.text || '♪'}
                    </button>
                  ))}
                {lyState === 'ok' && synced.length === 0 && lyrics && <div className="lyplain">{lyrics.plain}</div>}
              </div>
            )}

            {view === 'queue' && (
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

          <div className="ftabs">
            {(['art', 'lyrics', 'queue'] as View[]).map((v) => (
              <button key={v} type="button" className={`ftab${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
                {v === 'art' ? 'Lagu' : v === 'lyrics' ? 'Lirik' : 'Antrean'}
              </button>
            ))}
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
        </div>
      ) : null}
    </div>
  );
}
