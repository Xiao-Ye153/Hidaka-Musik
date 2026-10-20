'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProfileView from '@/components/ProfileView';
import { useI18n } from '@/components/I18nProvider';

function UserView() {
  const { t: tr } = useI18n();
  const uid = useSearchParams().get('uid') || '';
  if (!uid) return <p className="greeting-sub">{tr("Pengguna tidak ditemukan.")}</p>;
  return <ProfileView key={uid} uid={uid} />;
}

export default function UserPage() {
  return (
    <Suspense fallback={null}>
      <UserView />
    </Suspense>
  );
}
