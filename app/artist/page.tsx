'use client';

import '../home.css';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Play, Radio } from 'lucide-react';
import { useExtras } from '@/components/Extras';
import { usePlayer } from '@/components/Providers';
import { LazyRow, Spin } from '@/components/Rows';
import TrackRow from '@/components/TrackRow';
import { cleanArtistName, hiRes, searchTracks } from '@/lib/api';
import { getArtistBio } from '@/lib/bio';
import { useAuth } from '@/components/AuthProvider';
import type { Track } from '@/lib/tracks';

function ArtistView() {
  const router = useRouter();
  const params = useSearchParams();
  const name = (params.get('name') || '').trim();
  const clean = cleanArtistName(name) || name;
  const { play } = usePlayer();
  const { user } = useAuth();
  const { isFollowing, toggleArtist } = useExtras();
  const [songs, setSongs] = useState<Track[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [bio, setBio] = useState('');
  const [bioLoading, setBioLoading] = useState(true);

  useEffect(() => {
    if (!name) return;
    const ctl = new AbortController();
    setStatus('loading');
    setSongs([]);
    (async () => {
      try {
        let r = await searchTracks(`${clean} official music video`, 10, ctl.signal);
        if (r.length < 3) r = await searchTracks(`${clean} song`, 10, ctl.signal);
        if (r.length < 3) r = await searchTracks(clean, 10, ctl.signal);
        setSongs(r);
        setStatus('ok');
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') setStatus('error');
      }
    })();
    setBio('');
    setBioLoading(true);
    getArtistBio(clean, user?.uid ?? null)
      .then((b) => {
        if (b) setBio(b);
      })
      .catch(() => {})
      .finally(() => setBioLoading(false));
    return () => ctl.abort();
  }, [name, clean, user?.uid]);

  if (!name) return <p className="greeting-sub">Nama artis tidak ada.</p>;

  const following = isFollowing(name);
  const hero = songs[0]?.thumb ? hiRes(songs[0].thumb) : undefined;

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/');
  };

  const radio = async () => {
    try {
      const r = await searchTracks(`${clean} similar artists mix radio`, 12);
      if (r.length) play(r[0], r);
    } catch {}
  };

  return (
    <>
      <div className="ap-hero">
        {hero ? <img src={hero} alt="" /> : null}
        <button type="button" className="ap-back" onClick={goBack} aria-label="Kembali">
          <ArrowLeft size={20} />
        </button>
        <div className="ap-name">{name}</div>
      </div>

      <div className="ap-actions">
        <button type="button" className={`ap-btn${following ? ' on' : ''}`} onClick={() => toggleArtist(name)}>
          {following ? 'Subscribed' : 'Subscribe'}
        </button>
        <button type="button" className="ap-btn" onClick={radio}>
          <Radio size={16} />
          Radio
        </button>
        <button
          type="button"
          className="ap-play"
          disabled={songs.length === 0}
          onClick={() => songs[0] && play(songs[0], songs)}
          aria-label="Putar"
        >
          <Play size={22} fill="currentColor" />
        </button>
      </div>

      <div className="ap-about">
        <h3>Tentang</h3>
        <div className="ap-badge">Artis • {name}</div>
        <div className="ap-text">
          {bioLoading
            ? 'Memuat info artis...'
            : bio || `Dengarkan karya-karya terbaik dari ${clean}. Jelajahi lagu populer, album terbaru, dan single yang telah dirilis.`}
        </div>
      </div>

      <section className="hs">
        <div className="hs-head">
          <h2 className="hs-title">Top songs</h2>
        </div>
        {status === 'loading' && <Spin />}
        {status === 'error' && <p className="hs-note">Lagu belum bisa dimuat.</p>}
        <div className="track-list">
          {songs.map((t, i) => (
            <TrackRow key={t.id} track={t} index={i} queue={songs} />
          ))}
        </div>
      </section>

      {status === 'ok' && (
        <>
          <LazyRow title="Singles & EPs" q={`${clean} single EP official audio 2024 2025`} max={8} />
          <LazyRow title="Videos" q={`${clean} official music video mv`} max={6} variant="video" />
          <LazyRow title="Featured on" q={`${clean} featured collaboration playlist`} max={6} />
        </>
      )}
    </>
  );
}

export default function ArtistPage() {
  return (
    <Suspense fallback={null}>
      <ArtistView />
    </Suspense>
  );
}
