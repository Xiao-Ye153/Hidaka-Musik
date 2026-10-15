'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProfileView from '@/components/ProfileView';

function UserView() {
  const uid = useSearchParams().get('uid') || '';
  if (!uid) return <p className="greeting-sub">Pengguna tidak ditemukan.</p>;
  return <ProfileView key={uid} uid={uid} />;
}

export default function UserPage() {
  return (
    <Suspense fallback={null}>
      <UserView />
    </Suspense>
  );
}
