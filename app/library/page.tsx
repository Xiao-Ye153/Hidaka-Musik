'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, Heart, ListMusic, Search, User } from 'lucide-react';
import { useExtras } from '@/components/Extras';
import ArtistAvatar from '@/components/ArtistAvatar';
import TrackRow from '@/components/TrackRow';
import TrackThumb from '@/components/TrackThumb';
import { usePlayer } from '@/components/Providers';
import { useI18n } from '@/components/I18nProvider';

const TABS = [
  { id: 'liked', label: 'Disukai', Icon: Heart },
  { id: 'artist', label: 'Artist', Icon: User },
  { id: 'playlist', label: 'Playlist', Icon: ListMusic }
] as const;

type TabId = (typeof TABS)[number]['id'];

function parseListId(input: string) {
  const m = input.match(/[?&]list=([\w-]+)/);
  if (m) return m[1];
  return /^[\w-]{10,}$/.test(input.trim()) ? input.trim() : '';
}

export default function LibraryPage() {
  const { t: tr } = useI18n();
  const router = useRouter();
  const { liked } = usePlayer();
  const { playlists, artists, createPlaylist } = useExtras();
  const [tab, setTab] = useState<TabId>('liked');
  const [newName, setNewName] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const create = () => {
    if (!newName.trim()) return;
    const id = createPlaylist(newName);
    setNewName('');
    router.push(`/playlist?id=${id}`);
  };

  const importList = async () => {
    const id = parseListId(link);
    if (!id) {
      setMsg(tr("Link playlist tidak dikenali."));
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const r = await fetch(`/api/playlist?list=${encodeURIComponent(id)}`);
      const d = await r.json();
      if (!r.ok || !Array.isArray(d.tracks)) throw new Error(d?.error || 'gagal');
      const tracks = d.tracks.map((t: { id: string; title: string; channel?: string; thumb?: string }) => ({
        id: t.id,
        title: t.title,
        artist: t.channel || '',
        thumb: t.thumb
      }));
      const pid = createPlaylist(d.title || tr('Playlist YouTube Music'), tracks);
      setLink('');
      router.push(`/playlist?id=${pid}`);
    } catch {
      setMsg(tr("Playlist tidak bisa diimpor. Pastikan linknya publik."));
    }
    setBusy(false);
  };

  return (
    <>
      <h1 className="page-title">{tr("Library")}</h1>
      <p className="page-sub">
        {tr('{n} lagu', { n: liked.length })} · {tr('{n} artis', { n: artists.length })} · {tr('{n} playlist', { n: playlists.length })}
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
            {tr(label)}
          </button>
        ))}
      </div>

      {tab === 'liked' && liked.length > 0 && (
        <div className="track-list" style={{ marginTop: 22 }}>
          {liked.map((t, i) => (
            <TrackRow key={t.id} track={t} index={i} queue={liked} />
          ))}
        </div>
      )}

      {tab === 'artist' && artists.length > 0 && (
        <div className="track-list" style={{ marginTop: 22 }}>
          {artists.map((a) => (
            <Link key={a} href={`/artist?name=${encodeURIComponent(a)}`} className="row glass-soft">
              <ArtistAvatar name={a} />
              <span className="row-body">
                <span className="row-title" style={{ display: 'block' }}>
                  {a}
                </span>
                <span className="row-sub" style={{ display: 'block' }}>
                  {tr("Artis")}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}

      {tab === 'playlist' && (
        <>
          <div className="pl-form" style={{ marginTop: 22 }}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={tr("Nama playlist baru")} onKeyDown={(e) => e.key === 'Enter' && create()} />
            <button type="button" onClick={create}>
              {tr("Buat")}
            </button>
          </div>
          <div className="pl-form">
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder={tr("Tempel link playlist YouTube Music")} />
            <button type="button" onClick={importList} disabled={busy} aria-label={tr("Impor")}>
              <Download size={18} />
            </button>
          </div>
          {msg ? <p className="greeting-sub" style={{ fontSize: 14 }}>{msg}</p> : null}

          <div className="track-list" style={{ marginTop: 18 }}>
            {playlists.map((p) => (
              <Link key={p.id} href={`/playlist?id=${p.id}`} className="row glass-soft">
                {p.tracks[0] ? (
                  <TrackThumb track={p.tracks[0]} className="thumb" />
                ) : (
                  <span className="thumb" style={{ background: 'var(--surface2)' }}>
                    <ListMusic size={24} />
                  </span>
                )}
                <span className="row-body">
                  <span className="row-title" style={{ display: 'block' }}>
                    {p.name}
                  </span>
                  <span className="row-sub" style={{ display: 'block' }}>
                    {tr('{n} lagu', { n: p.tracks.length })}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      {((tab === 'liked' && liked.length === 0) || (tab === 'artist' && artists.length === 0) || (tab === 'playlist' && playlists.length === 0)) && (
        <div className="empty glass-soft">
          <div className="empty-orb" />
          {tab === 'liked' && (
            <>
              <h3>{tr("Belum Ada Lagu Disukai")}</h3>
              <p>
                {tr("Klik ikon")} <Heart size={18} /> {tr("pada Mini Player atau Full Player saat memutar lagu favoritmu.")}
              </p>
            </>
          )}
          {tab === 'artist' && (
            <>
              <h3>{tr("Belum Ada Artis")}</h3>
              <p>{tr("Buka halaman artis dari pemutar, lalu ikuti artis favoritmu.")}</p>
            </>
          )}
          {tab === 'playlist' && (
            <>
              <h3>{tr("Belum Ada Playlist")}</h3>
              <p>{tr("Buat playlist di atas atau impor dari link YouTube Music.")}</p>
            </>
          )}
          <Link href="/search" className="pill-btn">
            <Search size={20} />
            {tr('Cari & Temukan Lagu')}
          </Link>
        </div>
      )}
    </>
  );
}
