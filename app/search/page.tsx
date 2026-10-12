'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search as SearchIcon } from 'lucide-react';

function SearchView() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  return (
    <>
      <h1 className="page-title">Cari</h1>
      <p className="page-sub">Lagu, artis, dan playlist</p>

      <div className="search-box glass-soft">
        <SearchIcon size={22} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Mau dengar apa hari ini?"
          aria-label="Cari lagu"
          enterKeyHint="search"
        />
      </div>

      <div className="empty glass-soft">
        <div className="empty-orb" />
        <h3>Pencarian aktif di fase 2</h3>
        <p>Kolom ini akan terhubung ke pencarian YouTube Music begitu backend JS selesai dipasang.</p>
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchView />
    </Suspense>
  );
}
