'use client';

import Link from 'next/link';
import ProfileView from '@/components/ProfileView';
import { useAuth } from '@/components/AuthProvider';
import { useI18n } from '@/components/I18nProvider';

export default function ProfilePage() {
  const { t: tr } = useI18n();
  const { user, ready } = useAuth();

  if (!ready) return <p className="greeting-sub">{tr("Memuat...")}</p>;
  if (!user) {
    return (
      <>
        <h1 className="page-title">{tr("Profil")}</h1>
        <p className="page-sub">{tr("Masuk untuk melihat dan mengedit profilmu.")}</p>
        <div className="big-actions">
          <Link href="/login" className="pill-btn accent">
            {tr("Masuk / Daftar")}
          </Link>
        </div>
      </>
    );
  }
  return <ProfileView uid={user.uid} />;
}
