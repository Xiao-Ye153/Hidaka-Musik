'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Library, MessageCircle, Palette, Search, Settings, User } from 'lucide-react';
import { useTheme } from './Providers';
import { useI18n } from '@/components/I18nProvider';

const LEFT = [
  { href: '/', label: 'Beranda', Icon: House },
  { href: '/search', label: 'Cari', Icon: Search },
  { href: '/library', label: 'Library', Icon: Library }
];

const RIGHT = [
  { href: '/chat', label: 'Chat', Icon: MessageCircle },
  { href: '/profile', label: 'Profil', Icon: User },
  { href: '/settings', label: 'Pengaturan', Icon: Settings }
];

export default function BottomNav() {
  const { t: tr } = useI18n();
  const path = usePathname();
  const { openSheet } = useTheme();

  const item = ({ href, label, Icon }: (typeof LEFT)[number]) => {
    const active = href === '/' ? path === '/' : path.startsWith(href);
    return (
      <Link key={href} href={href} aria-label={tr(label)} className={`nav-item${active ? ' active' : ''}`}>
        <span className="bubble">
          <Icon size={22} strokeWidth={2} />
        </span>
      </Link>
    );
  };

  return (
    <nav className="nav glass" aria-label={tr("Navigasi utama")}>
      {LEFT.map(item)}
      <div aria-hidden="true" />
      {RIGHT.map(item)}
      <div className="nav-fab">
        <button type="button" onClick={openSheet} aria-label={tr("Pilih tema")}>
          <Palette size={26} strokeWidth={2} />
        </button>
      </div>
    </nav>
  );
}
