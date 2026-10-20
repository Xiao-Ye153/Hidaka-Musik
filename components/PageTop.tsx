'use client';

import Link from 'next/link';
import { Heart, MessageCircle, Search } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { APP } from '@/lib/config';
import { useI18n } from '@/components/I18nProvider';

export default function PageTop() {
  const { t: tr } = useI18n();
  const { photo } = useAuth();
  return (
    <header className="top">
      <Link href="/profile" className="avatar-ring" aria-label={tr("Profil")}>
        <div className="avatar" style={{ fontSize: 22 }}>
          {photo ? <img src={photo} alt="" referrerPolicy="no-referrer" /> : APP.nameTop.charAt(0)}
        </div>
      </Link>
      <div className="brand">
        <div className="brand-name">
          {APP.nameTop}
          <span>{APP.nameAccent}</span>
        </div>
        <div className="brand-sub">{APP.subtitle}</div>
      </div>
      <div className="icon-row">
        <Link href="/chat" className="round-btn" aria-label={tr("Chat")}>
          <MessageCircle size={22} />
        </Link>
        <Link href="/search" className="round-btn" aria-label={tr("Cari")}>
          <Search size={22} />
        </Link>
        <Link href="/library" className="round-btn" aria-label={tr("Disukai")}>
          <Heart size={22} />
        </Link>
      </div>
    </header>
  );
}
