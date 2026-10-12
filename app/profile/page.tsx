'use client';

import { Bell, LogOut, MessageCircle, Pencil, Plus, Share2 } from 'lucide-react';
import { APP } from '@/lib/config';

export default function ProfilePage() {
  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) await navigator.share({ title: APP.name, url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  };

  return (
    <>
      <div className="profile-hero" />
      <div className="profile-actions">
        <button type="button" className="round-btn" aria-label="Bagikan" onClick={share}>
          <Share2 size={21} />
        </button>
        <button type="button" className="round-btn" aria-label="Notifikasi">
          <Bell size={21} />
        </button>
        <button type="button" className="round-btn" aria-label="Chat">
          <MessageCircle size={21} />
        </button>
        <button type="button" className="round-btn" aria-label="Keluar">
          <LogOut size={21} />
        </button>
      </div>

      <section className="profile-main">
        <div className="avatar profile-avatar">{APP.defaultUser.charAt(0).toUpperCase()}</div>
        <button type="button" className="pill-btn profile-edit" style={{ height: 44, padding: '0 20px', fontSize: 15 }}>
          <Pencil size={17} />
          Edit profil
        </button>

        <h1 className="profile-name">@{APP.defaultUser}</h1>
        <p className="profile-bio">Belum ada bio. Ketuk Edit profil untuk menambahkannya.</p>

        <div className="profile-stats">
          <span>
            <b>0</b>Pengikut
          </span>
          <span>
            <b>0</b>Mengikuti
          </span>
        </div>

        <div className="block-head">
          <h3>Lagu favorit</h3>
          <button type="button" className="mini-pill">
            Atur
          </button>
        </div>
        <div className="dashed">Belum ada lagu favorit. Ketuk Atur untuk memilih dari Lagu Disukai atau lagu yang sedang diputar.</div>

        <div className="block-head">
          <h3>Playlist</h3>
          <button type="button" className="mini-pill">
            Atur
          </button>
        </div>
        <div className="dashed">Belum ada playlist yang ditampilkan. Ketuk Atur untuk memilih dari playlist di Library-mu.</div>

        <div className="block-head">
          <h3>Galeri</h3>
        </div>
        <div className="hscroll">
          <button type="button" className="gallery-add" aria-label="Tambah foto">
            <Plus size={30} />
          </button>
        </div>
      </section>
    </>
  );
}
