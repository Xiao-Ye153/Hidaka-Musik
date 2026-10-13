'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronRight, Coffee, Download, Heart, History, LayoutList, LogOut, Link2, MessageCircle, Mic2, Monitor, Palette, User } from 'lucide-react';
import { APP } from '@/lib/config';
import { THEMES } from '@/lib/themes';
import { useAuth } from '@/components/AuthProvider';
import IconAvatar from '@/components/IconAvatar';
import { useExtras } from '@/components/Extras';
import { usePlayer, useTheme } from '@/components/Providers';

type InstallEvent = Event & { prompt: () => Promise<void> };

export default function SettingsPage() {
  const { user, handle, photo, logout } = useAuth();
  const { liked, recent } = usePlayer();
  const { playlists, artists } = useExtras();
  const { theme, openSheet } = useTheme();
  const [notif, setNotif] = useState<NotificationPermission | 'unsupported'>('default');
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);
  const [hint, setHint] = useState('');

  useEffect(() => {
    setNotif(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const askNotif = async () => {
    if (typeof Notification === 'undefined') return;
    setNotif(await Notification.requestPermission());
  };

  const install = async () => {
    if (installEvt) {
      await installEvt.prompt();
      setInstallEvt(null);
      return;
    }
    setHint('Buka menu browser, lalu pilih "Tambahkan ke layar utama".');
  };

  const notifText =
    notif === 'granted'
      ? 'Aktif'
      : notif === 'denied'
        ? 'Diblokir, ubah lewat pengaturan browser'
        : notif === 'unsupported'
          ? 'Browser ini belum mendukung notifikasi'
          : 'Belum diizinkan, ketuk untuk mengaktifkan';

  const themeLabel = THEMES.find((t) => t.id === theme)?.label ?? 'Dark';

  return (
    <>
      <section className="settings-hero">
        <div className="settings-cover">
          <IconAvatar />
        </div>
        <h2>{APP.name}</h2>
        <p>{APP.tagline}</p>
      </section>

      <section className="panel glass-soft">
        <div className="account">
          <div className="avatar">
            {photo ? <img src={photo} alt="" referrerPolicy="no-referrer" /> : user ? handle.charAt(0).toUpperCase() : '?'}
          </div>
          <div>
            <small>Akunmu</small>
            <b>{user ? `@${handle}` : 'Belum masuk'}</b>
          </div>
        </div>
        {user ? (
          <div className="btn-pair">
            <Link href="/profile" className="pill-btn accent">
              <User size={20} />
              Profil
            </Link>
            <button type="button" className="pill-btn" onClick={() => logout()}>
              <LogOut size={20} />
              Keluar
            </button>
          </div>
        ) : (
          <div className="btn-pair" style={{ gridTemplateColumns: '1fr' }}>
            <Link href="/login" className="pill-btn accent">
              <User size={20} />
              Masuk / Daftar
            </Link>
          </div>
        )}
      </section>

      <section className="panel glass-soft">
        <div className="panel-title">
          <LayoutList size={22} />
          Koleksimu
        </div>
        <div className="stat-grid">
          <div className="stat">
            <Heart size={22} />
            <b>{liked.length}</b>
            <span>Disukai</span>
          </div>
          <div className="stat">
            <LayoutList size={22} />
            <b>{playlists.length}</b>
            <span>Playlist</span>
          </div>
          <div className="stat">
            <Mic2 size={22} />
            <b>{artists.length}</b>
            <span>Artis</span>
          </div>
          <div className="stat">
            <History size={22} />
            <b>{recent.length}</b>
            <span>Terakhir</span>
          </div>
        </div>
      </section>

      <button type="button" className="list-row glass-soft" onClick={askNotif}>
        <span className="ico">
          <Bell size={26} />
        </span>
        <span>
          <b>Notifikasi pesan</b>
          <small>{notifText}</small>
        </span>
        <ChevronRight className="chev" size={22} />
      </button>

      <section className="panel glass-soft">
        <div className="panel-title">
          <Palette size={22} />
          Tampilan
        </div>
        <button type="button" className="pill-btn block" style={{ marginTop: 22 }} onClick={openSheet}>
          <Palette size={20} />
          Tema: {themeLabel}
        </button>
      </section>

      <section className="panel glass-soft">
        <div className="panel-title center">Aplikasi</div>
        <div className="kv">
          <span>Nama</span>
          <b>{APP.name}</b>
        </div>
        <div className="kv">
          <span>Versi</span>
          <b>{APP.version}</b>
        </div>
        <div className="kv">
          <span>Platform</span>
          <b>{APP.platform}</b>
        </div>
        <div className="kv">
          <span>Server</span>
          <b>{APP.server}</b>
        </div>
      </section>

      <section className="panel glass-soft">
        <div className="panel-title">
          <Monitor size={22} />
          Developer profile
        </div>
        <div className="divider" />
        <div className="kv" style={{ marginTop: 20 }}>
          <span>Developed by</span>
          <b style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconAvatar size={28} />
            {APP.developer}
          </b>
        </div>
        <div className="field-label">
          <Heart size={16} color="#f87171" fill="#f87171" />
          Lagu yang disukai
        </div>
        <div className="field-box">Semua lagu {APP.developer}</div>
        <div className="field-label">
          <MessageCircle size={16} color="var(--accent)" />
          Playlist yang disukai
        </div>
        <div className="field-box">Semua playlist {APP.developer}</div>
      </section>

      <button type="button" className="pill-btn block glass-soft" style={{ marginTop: 28 }} onClick={install}>
        <Download size={22} />
        Install Aplikasi
      </button>
      {hint ? (
        <p className="follow" style={{ marginTop: 14, letterSpacing: 0 }}>
          {hint}
        </p>
      ) : null}

      <div className="follow">IKUTI KAMI</div>
      <div className="follow-row">
        <a href="#" aria-label="Chat">
          <MessageCircle size={24} />
        </a>
        <a href="#" aria-label="Tautan">
          <Link2 size={24} />
        </a>
        <a href="#" aria-label="Dukung kami">
          <Coffee size={24} />
        </a>
      </div>
    </>
  );
}
