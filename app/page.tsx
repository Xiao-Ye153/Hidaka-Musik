'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, AudioLines, Heart, Moon, Music2, Pause, Play, Sparkles, TrendingUp } from 'lucide-react';
import PageTop from '@/components/PageTop';
import { Featured, MoreSections, SpeedDial } from '@/components/HomeSections';
import TrackRow from '@/components/TrackRow';
import TrackThumb from '@/components/TrackThumb';
import { useAuth } from '@/components/AuthProvider';
import { usePlayer } from '@/components/Providers';
import { searchTracks } from '@/lib/api';
import { HOME_CHIPS, HOME_QUERIES, type Track } from '@/lib/tracks';

const CHIP_ICON: Record<string, typeof Music2 | null | undefined> = {
  all: null,
  sparkles: Sparkles,
  trending: TrendingUp,
  music: Music2,
  moon: Moon,
  audio: AudioLines
};

function greet(h: number) {
  if (h < 11) return 'Selamat pagi, mulai harimu dengan musik.';
  if (h < 15) return 'Selamat siang, temani istirahatmu dengan musik.';
  if (h < 18) return 'Selamat sore, saatnya santai dengan nada favorit.';
  return 'Selamat malam, saatnya menikmati nada.';
}

export default function HomePage() {
  const router = useRouter();
  const { handle } = useAuth();
  const { current, playing, recent, play, toggle, isLiked, toggleLike } = usePlayer();
  const [chip, setChip] = useState('all');
  const randomQ = useRef(HOME_QUERIES[Math.floor(Math.random() * HOME_QUERIES.length)]);
  const [hello, setHello] = useState('Halo, selamat menikmati musik.');
  const [picks, setPicks] = useState<Track[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    setHello(greet(new Date().getHours()));
  }, []);

  useEffect(() => {
    const ctl = new AbortController();
    const found = HOME_CHIPS.find((c) => c.id === chip);
    const q = found?.q || randomQ.current;
    setStatus('loading');
    searchTracks(q, 24, ctl.signal)
      .then((r) => {
        setPicks(r);
        setStatus('ok');
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setStatus('error');
      });
    return () => ctl.abort();
  }, [chip]);

  const heroTrack = picks[0];
  const heroPlaying = !!heroTrack && playing && current?.id === heroTrack.id;

  const onHeroPlay = () => {
    if (!heroTrack) {
      router.push('/search');
      return;
    }
    if (current?.id === heroTrack.id) toggle();
    else play(heroTrack, picks);
  };

  return (
    <>
      <PageTop />

      <h1 className="greeting">
        Hai, @{handle}
        <em>.</em>
      </h1>
      <p className="greeting-sub">{hello}</p>

      <div className="chips" role="tablist" aria-label="Kategori">
        {HOME_CHIPS.map((c) => {
          const Icon = CHIP_ICON[c.icon];
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={chip === c.id}
              className={`chip${chip === c.id ? ' active' : ''}`}
              onClick={() => setChip(c.id)}
            >
              {Icon ? <Icon size={19} strokeWidth={1.8} /> : null}
              {c.label}
            </button>
          );
        })}
      </div>

      <h2 className="section-title">Curated &amp; trending</h2>

      <section className="hero">
        <div className="hero-index">01 / DAILY MIX</div>
        <div className="hero-kicker">
          <span className="dot" />
          The daily edit
        </div>
        <h3 className="hero-title">Discover weekly</h3>
        <p className="hero-text">
          Temukan favorit baru.
          <br />
          Satu lagu, sejuta suasana.
        </p>
        <div className="hero-actions">
          <button type="button" className="play-lg" aria-label={heroPlaying ? 'Jeda' : 'Putar'} onClick={onHeroPlay}>
            {heroPlaying ? <Pause size={34} fill="currentColor" /> : <Play size={34} fill="currentColor" />}
          </button>
          <button
            type="button"
            className={`soft-btn${heroTrack && isLiked(heroTrack.id) ? ' liked' : ''}`}
            aria-label="Suka"
            disabled={!heroTrack}
            onClick={() => heroTrack && toggleLike(heroTrack)}
          >
            <Heart size={26} fill={heroTrack && isLiked(heroTrack.id) ? 'currentColor' : 'none'} />
          </button>
          <Link href="/search" className="soft-btn" aria-label="Jelajahi">
            <ArrowUpRight size={26} />
          </Link>
        </div>
      </section>

      <div className="duo">
        <Link href="/search?q=musik%20fokus%20instrumental" className="tile">
          <span className="rings" aria-hidden="true" />
          <span className="tile-arrow">
            <ArrowUpRight size={20} />
          </span>
          <div className="tile-kicker">
            <AudioLines size={16} />
            In your zone
          </div>
          <div className="tile-title">
            Find your
            <br />
            flow.
          </div>
          <p className="tile-text">Musik untuk fokus</p>
        </Link>
        <Link href="/search?q=lagu%20santai%20indonesia" className="tile">
          <span className="rings" aria-hidden="true" style={{ left: 'auto', right: -22, opacity: 0.35 }} />
          <span className="tile-arrow">
            <ArrowUpRight size={20} />
          </span>
          <div className="tile-kicker">
            <Moon size={16} />
            Slow it down
          </div>
          <div className="tile-title">
            After
            <br />
            hours.
          </div>
          <p className="tile-text">Santai. Nikmati nadanya.</p>
        </Link>
      </div>

      <Featured tracks={picks} />
      <SpeedDial tracks={picks} />

      <div className="section-head">
        <h2 className="section-title">Pilihan harian</h2>
        <button
          type="button"
          className="hs-btn"
          disabled={picks.length === 0}
          onClick={() => picks[0] && play(picks[0], picks)}
        >
          Putar semua
        </button>
      </div>

      {status === 'loading' && <p className="greeting-sub">Memuat lagu...</p>}
      {status === 'error' && (
        <p className="greeting-sub">Lagu belum bisa dimuat. Cek koneksi, lalu coba lagi nanti.</p>
      )}
      {status === 'ok' && picks.length === 0 && <p className="greeting-sub">Belum ada lagu untuk kategori ini.</p>}

      <div className="track-list">
        {picks.slice(0, 8).map((t, i) => (
          <TrackRow key={t.id} track={t} index={i} queue={picks} />
        ))}
      </div>

      {recent.length > 0 && (
        <>
          <div className="section-head">
            <h2 className="section-title">Putar lagi</h2>
            <span className="section-tag">On repeat</span>
          </div>

          <div className="hscroll">
            {recent.slice(0, 10).map((t) => (
              <button key={t.id} type="button" className="card glass-soft" onClick={() => play(t, recent)}>
                <TrackThumb track={t} className="art" />
                <div className="row-title">{t.title}</div>
                <div className="row-sub">{t.artist}</div>
              </button>
            ))}
          </div>
        </>
      )}
    
      <MoreSections tracks={picks} />
    </>
  );
}
