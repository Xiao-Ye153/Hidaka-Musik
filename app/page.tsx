'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, AudioLines, Heart, Moon, Music2, Pause, Play, Sparkles, TrendingUp } from 'lucide-react';
import PageTop from '@/components/PageTop';
import TrackThumb from '@/components/TrackThumb';
import { usePlayer } from '@/components/Providers';
import { APP } from '@/lib/config';
import { DAILY_PICKS, HOME_CHIPS, ON_REPEAT } from '@/lib/tracks';

const CHIP_ICON: Record<string, typeof Music2 | null> = {
  all: null,
  sparkles: Sparkles,
  trending: TrendingUp,
  music: Music2,
  moon: Moon,
  audio: AudioLines
};

function greet(h: number) {
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export default function HomePage() {
  const { current, playing, play, toggle, isLiked, toggleLike } = usePlayer();
  const [chip, setChip] = useState('all');
  const [hello, setHello] = useState('Halo');

  useEffect(() => {
    setHello(greet(new Date().getHours()));
  }, []);

  const heroTrack = DAILY_PICKS[0];
  const heroPlaying = playing && current?.id === heroTrack.id;

  return (
    <>
      <PageTop />

      <h1 className="greeting">
        Hai, @{APP.defaultUser}
        <em>.</em>
      </h1>
      <p className="greeting-sub">{hello}, saatnya menikmati nada.</p>

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
          <button
            type="button"
            className="play-lg"
            aria-label={heroPlaying ? 'Jeda' : 'Putar'}
            onClick={() => (current?.id === heroTrack.id ? toggle() : play(heroTrack, DAILY_PICKS))}
          >
            {heroPlaying ? <Pause size={34} fill="currentColor" /> : <Play size={34} fill="currentColor" />}
          </button>
          <button
            type="button"
            className={`soft-btn${isLiked(heroTrack.id) ? ' liked' : ''}`}
            aria-label="Suka"
            onClick={() => toggleLike(heroTrack)}
          >
            <Heart size={26} fill={isLiked(heroTrack.id) ? 'currentColor' : 'none'} />
          </button>
          <Link href="/search" className="soft-btn" aria-label="Jelajahi">
            <ArrowUpRight size={26} />
          </Link>
        </div>
      </section>

      <div className="duo">
        <Link href="/search?q=musik%20fokus" className="tile">
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
        <Link href="/search?q=musik%20santai" className="tile">
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

      <div className="section-head">
        <h2 className="section-title">Pilihan harian</h2>
        <Link href="/search" className="section-link">
          Lihat semua
          <ArrowUpRight size={17} />
        </Link>
      </div>

      <div className="track-list">
        {DAILY_PICKS.map((t, i) => {
          const now = current?.id === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`row glass-soft${now ? ' now' : ''}`}
              onClick={() => (now ? toggle() : play(t, DAILY_PICKS))}
            >
              <span className="row-num">{String(i + 1).padStart(2, '0')}</span>
              <TrackThumb track={t} className="thumb" />
              <span className="row-body">
                <span className="row-title" style={{ display: 'block' }}>
                  {t.title}
                </span>
                <span className="row-sub" style={{ display: 'block' }}>
                  {t.artist}
                </span>
              </span>
              <span className="row-play">
                {now && playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="section-head">
        <h2 className="section-title">Putar lagi</h2>
        <span className="section-tag">On repeat</span>
      </div>

      <div className="hscroll">
        {ON_REPEAT.map((t) => (
          <button key={t.id} type="button" className="card glass-soft" onClick={() => play(t, ON_REPEAT)}>
            <TrackThumb track={t} className="art" />
            <div className="row-title">{t.title}</div>
            <div className="row-sub">{t.artist}</div>
          </button>
        ))}
      </div>
    </>
  );
}
