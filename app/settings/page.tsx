'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronRight, Coffee, Download, Heart, History, LayoutList, LogOut, Link2, MessageCircle, Mic2, Monitor, Palette, User } from 'lucide-react';
import { ADMIN_UIDS, APP } from '@/lib/config';
import { LANGS } from '@/lib/i18n';
import { THEMES } from '@/lib/themes';
import { useAuth } from '@/components/AuthProvider';
import IconAvatar from '@/components/IconAvatar';
import { useExtras } from '@/components/Extras';
import { useProgress2 } from '@/components/ProgressProvider';
import { usePlayer, useTheme } from '@/components/Providers';
import { useI18n } from '@/components/I18nProvider';

type InstallEvent = Event & { prompt: () => Promise<void> };

export default function SettingsPage() {
  const { t: tr, lang, setLang } = useI18n();
  const { user, handle, photo, logout } = useAuth();
  const { liked, recent } = usePlayer();
  const { playlists, artists } = useExtras();
  const { active, level } = useProgress2();
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
    setHint(tr('Buka menu browser, lalu pilih "Tambahkan ke layar utama".'));
  };

  const notifText =
    notif === 'granted'
      ? tr('Aktif')
      : notif === 'denied'
        ? tr('Diblokir, ubah lewat pengaturan browser')
        : notif === 'unsupported'
          ? tr('Browser ini belum mendukung notifikasi')
          : tr('Belum diizinkan, ketuk untuk mengaktifkan');

  const themeLabel = THEMES.find((t) => t.id === theme)?.label ?? 'Dark';

  return (
    <>
      <section className="settings-hero">
        <div className="settings-cover">
          <IconAvatar />
        </div>
        <h2>{APP.name}</h2>
        <p>{tr(APP.tagline)}</p>
      </section>

      <section className="panel glass-soft">
        <div className="account">
          <div className="avatar">
            {photo ? <img src={photo} alt="" referrerPolicy="no-referrer" /> : user ? handle.charAt(0).toUpperCase() : '?'}
          </div>
          <div>
            <small>{tr("Akunmu")}</small>
            <b>{user ? `@${handle}` : tr('Belum masuk')}</b>
          </div>
        </div>
        {user ? (
          <div className="btn-pair">
            <Link href="/profile" className="pill-btn accent">
              <User size={20} />
              {tr("Profil")}
            </Link>
            <button type="button" className="pill-btn" onClick={() => logout()}>
              <LogOut size={20} />
              {tr("Keluar")}
            </button>
          </div>
        ) : (
          <div className="btn-pair" style={{ gridTemplateColumns: '1fr' }}>
            <Link href="/login" className="pill-btn accent">
              <User size={20} />
              {tr("Masuk / Daftar")}
            </Link>
          </div>
        )}
      </section>

      <section className="panel glass-soft">
        <div className="panel-title">
          <LayoutList size={22} />
          {tr("Koleksimu")}
        </div>
        <div className="stat-grid">
          <div className="stat">
            <Heart size={22} />
            <b>{liked.length}</b>
            <span>{tr("Disukai")}</span>
          </div>
          <div className="stat">
            <LayoutList size={22} />
            <b>{playlists.length}</b>
            <span>{tr("Playlist")}</span>
          </div>
          <div className="stat">
            <Mic2 size={22} />
            <b>{artists.length}</b>
            <span>{tr("Artis")}</span>
          </div>
          <div className="stat">
            <History size={22} />
            <b>{recent.length}</b>
            <span>{tr("Terakhir")}</span>
          </div>
        </div>
      </section>

      {user && active ? (
        <section className="panel glass-soft">
          <div className="panel-title">{tr('Level {n}', { n: level.level })}</div>
          <div className="ms-bar">
            <i style={{ width: `${Math.min(100, (level.into / level.need) * 100)}%` }} />
          </div>
          <p className="ms-desc">
            {tr('{a} / {b} poin · +5 poin tiap 10 menit mendengarkan', { a: Math.floor(level.into), b: level.need })}
          </p>
        </section>
      ) : null}

      {user && ADMIN_UIDS.includes(user.uid) ? (
        <Link href="/admin" className="list-row glass-soft" style={{ marginBottom: 14 }}>
          <span className="ico">🔐</span>
          <span>
            <b>Admin Panel</b>
            <small>Kelola pengguna, level, dan peringkat</small>
          </span>
          <ChevronRight className="chev" size={22} />
        </Link>
      ) : null}

      <button type="button" className="list-row glass-soft" onClick={askNotif}>
        <span className="ico">
          <Bell size={26} />
        </span>
        <span>
          <b>{tr("Notifikasi pesan")}</b>
          <small>{notifText}</small>
        </span>
        <ChevronRight className="chev" size={22} />
      </button>

      <section className="panel glass-soft">
        <div className="panel-title">
          <Palette size={22} />
          {tr("Tampilan")}
        </div>
        <button type="button" className="pill-btn block" style={{ marginTop: 22 }} onClick={openSheet}>
          <Palette size={20} />
          {tr('Tema')}: {themeLabel}
        </button>

        <div className="field-label" style={{ marginTop: 22 }}>
          {tr('Bahasa')}
        </div>
        <div className="lang-row">
          {LANGS.map((l) => (
            <button key={l.id} type="button" className={`lang-btn${lang === l.id ? ' on' : ''}`} onClick={() => setLang(l.id)}>
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel glass-soft">
        <div className="panel-title center">{tr("Aplikasi")}</div>
        <div className="kv">
          <span>{tr("Nama")}</span>
          <b>{APP.name}</b>
        </div>
        <div className="kv">
          <span>{tr("Versi")}</span>
          <b>{APP.version}</b>
        </div>
        <div className="kv">
          <span>{tr("Platform")}</span>
          <b>{APP.platform}</b>
        </div>
        <div className="kv">
          <span>{tr("Server")}</span>
          <b>{APP.server}</b>
        </div>
      </section>

      <section className="panel glass-soft">
        <div className="panel-title">
          <Monitor size={22} />
          {tr("Developer profile")}
        </div>
        <div className="divider" />
        <div className="kv" style={{ marginTop: 20 }}>
          <span>{tr("Developed by")}</span>
          <b style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconAvatar size={28} />
            {APP.developer}
          </b>
        </div>
        <div className="field-label">
          <Heart size={16} color="#f87171" fill="#f87171" />
          {tr("Lagu yang disukai")}
        </div>
        <div className="field-box">{tr('Semua lagu {n}', { n: APP.developer })}</div>
        <div className="field-label">
          <MessageCircle size={16} color="var(--accent)" />
          {tr("Playlist yang disukai")}
        </div>
        <div className="field-box">{tr('Semua playlist {n}', { n: APP.developer })}</div>
      </section>

      <button type="button" className="pill-btn block glass-soft" style={{ marginTop: 28 }} onClick={install}>
        <Download size={22} />
        {tr("Install Aplikasi")}
      </button>
      {hint ? (
        <p className="follow" style={{ marginTop: 14, letterSpacing: 0 }}>
          {hint}
        </p>
      ) : null}

      <div className="follow">{tr("IKUTI KAMI")}</div>
      <div className="follow-row">
        <a href="#" aria-label={tr("Chat")}>
          <MessageCircle size={24} />
        </a>
        <a href="#" aria-label={tr("Tautan")}>
          <Link2 size={24} />
        </a>
        <a href="#" aria-label={tr("Dukung kami")}>
          <Coffee size={24} />
        </a>
      </div>
    </>
  );
}
