'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, ListMusic, Play, Search, User } from 'lucide-react';
import TrackThumb from '@/components/TrackThumb';
import { usePlayer } from '@/components/Providers';

const TABS = [
  { id: 'liked', label: 'Disukai', Icon: Heart },
  { id: 'artist', label: 'Artist', Icon: User },
  { id: 'playlist', label: 'Playlist', Icon: ListMusic }
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function LibraryPage() {
  const { liked, current, play } = usePlayer();
  const [tab, setTab] = useState<TabId>('liked');

  return (
    <>
      <h1 className="page-title">Library</h1>
      <p className="page-sub">
        {liked.length} lagu · 0 artis · 0 playlist
      </p>

      <div className="tabs glass-soft" role="tablist">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`tab${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={18} fill={id === 'liked' && tab === id ? 'currentColor' : 'none'} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'liked' && liked.length > 0 ? (
        <div className="track-list" style={{ marginTop: 22 }}>
          {liked.map((t, i) => (
            <button
              key={t.id}
              type="button"
              className={`row glass-soft${current?.id === t.id ? ' now' : ''}`}
              onClick={() => play(t, liked)}
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
                <Play size={18} fill="currentColor" />
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty glass-soft">
          <div className="empty-orb" />
          {tab === 'liked' && (
            <>
              <h3>Belum Ada Lagu Disukai</h3>
              <p>
                Klik ikon <Heart size={18} /> pada Mini Player atau Full Player saat memutar lagu favoritmu.
              </p>
            </>
          )}
          {tab === 'artist' && (
            <>
              <h3>Belum Ada Artis</h3>
              <p>Subscribe artis dari halaman artis, dan mereka akan muncul di sini.</p>
            </>
          )}
          {tab === 'playlist' && (
            <>
              <h3>Belum Ada Playlist</h3>
              <p>Buat playlist pertamamu dan kumpulkan lagu favorit di satu tempat.</p>
            </>
          )}
          <Link href="/search" className="pill-btn">
            <Search size={20} />
            Cari &amp; Temukan Lagu
          </Link>
        </div>
      )}
    </>
  );
}
