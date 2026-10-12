'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, Play, UserCheck, UserPlus } from 'lucide-react';
import { useExtras } from '@/components/Extras';
import { usePlayer } from '@/components/Providers';
import TrackRow from '@/components/TrackRow';
import { searchTracks } from '@/lib/api';
import type { Track } from '@/lib/tracks';

function ArtistView() {
  const params = useSearchParams();
  const name = (params.get('name') || '').trim();
  const { play } = usePlayer();
  const { isFollowing, toggleArtist } = useExtras();
  const [songs, setSongs] = useState<Track[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (!name) return;
    const ctl = new AbortController();
    setStatus('loading');
    setBio('');
    searchTracks(name, 20, ctl.signal)
      .then((r) => {
        setSongs(r);
        setStatus('ok');
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setStatus('error');
      });
    fetch(`/api/artist-bio?name=${encodeURIComponent(name)}&lang=id`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d?.bio) setBio(String(d.bio));
      })
      .catch(() => {});
    return () => ctl.abort();
  }, [name]);

  if (!name) {
    return <p className="greeting-sub">Nama artis tidak ada.</p>;
  }

  const following = isFollowing(name);

  return (
    <>
      <div className="back-row">
        <Link href="/library" className="round-btn" aria-label="Kembali">
          <ChevronLeft size={22} />
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
        <span className="avatar" style={{ width: 84, height: 84, fontSize: 34 }}>
          {name.charAt(0).toUpperCase()}
        </span>
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title" style={{ margin: 0, fontSize: 30 }}>
            {name}
          </h1>
          <p className="page-sub" style={{ marginTop: 4 }}>
            Artis
          </p>
        </div>
      </div>

      <div className="big-actions">
        <button
          type="button"
          className="pill-btn accent"
          disabled={songs.length === 0}
          onClick={() => songs[0] && play(songs[0], songs)}
        >
          <Play size={18} fill="currentColor" />
          Putar
        </button>
        <button type="button" className="pill-btn" onClick={() => toggleArtist(name)}>
          {following ? <UserCheck size={18} /> : <UserPlus size={18} />}
          {following ? 'Diikuti' : 'Ikuti'}
        </button>
      </div>

      {bio ? <p className="bio">{bio}</p> : null}

      <h2 className="section-title">Lagu</h2>
      {status === 'loading' && <p className="greeting-sub">Memuat lagu...</p>}
      {status === 'error' && <p className="greeting-sub">Lagu belum bisa dimuat.</p>}
      <div className="track-list">
        {songs.map((t, i) => (
          <TrackRow key={t.id} track={t} index={i} queue={songs} />
        ))}
      </div>
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
