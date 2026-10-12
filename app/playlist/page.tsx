'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Play, Trash2, X } from 'lucide-react';
import { useExtras } from '@/components/Extras';
import { usePlayer } from '@/components/Providers';
import TrackRow from '@/components/TrackRow';

function PlaylistView() {
  const router = useRouter();
  const params = useSearchParams();
  const { playlists, removeFromPlaylist, deletePlaylist } = useExtras();
  const { play } = usePlayer();
  const pl = playlists.find((p) => p.id === params.get('id'));

  if (!pl) {
    return (
      <>
        <div className="back-row">
          <Link href="/library" className="round-btn" aria-label="Kembali">
            <ChevronLeft size={22} />
          </Link>
        </div>
        <h1 className="page-title">Playlist tidak ditemukan</h1>
        <p className="page-sub">Playlist ini mungkin sudah dihapus.</p>
      </>
    );
  }

  return (
    <>
      <div className="back-row">
        <Link href="/library" className="round-btn" aria-label="Kembali">
          <ChevronLeft size={22} />
        </Link>
      </div>
      <h1 className="page-title">{pl.name}</h1>
      <p className="page-sub">{pl.tracks.length} lagu</p>

      <div className="big-actions">
        <button
          type="button"
          className="pill-btn accent"
          disabled={pl.tracks.length === 0}
          onClick={() => pl.tracks[0] && play(pl.tracks[0], pl.tracks)}
        >
          <Play size={18} fill="currentColor" />
          Putar semua
        </button>
        <button
          type="button"
          className="pill-btn"
          onClick={() => {
            deletePlaylist(pl.id);
            router.push('/library');
          }}
        >
          <Trash2 size={18} />
          Hapus
        </button>
      </div>

      {pl.tracks.length === 0 && <p className="greeting-sub">Playlist masih kosong. Tambahkan lagu dari pemutar.</p>}

      <div className="track-list" style={{ marginTop: 22 }}>
        {pl.tracks.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <TrackRow track={t} index={i} queue={pl.tracks} />
            </div>
            <button type="button" className="round-btn" aria-label="Hapus dari playlist" onClick={() => removeFromPlaylist(pl.id, t.id)}>
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

export default function PlaylistPage() {
  return (
    <Suspense fallback={null}>
      <PlaylistView />
    </Suspense>
  );
}
