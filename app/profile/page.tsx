'use client';

import Link from 'next/link';
import ProfileView from '@/components/ProfileView';
import { useAuth } from '@/components/AuthProvider';

export default function ProfilePage() {
  const { user, ready } = useAuth();

  if (!ready) return <p className="greeting-sub">Memuat...</p>;
  if (!user) {
    return (
      <>
        <h1 className="page-title">Profil</h1>
        <p className="page-sub">Masuk untuk melihat dan mengedit profilmu.</p>
        <div className="big-actions">
          <Link href="/login" className="pill-btn accent">
            Masuk / Daftar
          </Link>
        </div>
      </>
    );
  }
  return <ProfileView uid={user.uid} />;
}
