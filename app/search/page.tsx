'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search as SearchIcon, X } from 'lucide-react';
import TrackRow from '@/components/TrackRow';
import { searchTracks } from '@/lib/api';
import type { Track } from '@/lib/tracks';

const SUGGEST = ['Sal Priadi', 'Dewa 19', 'Nadin Amizah', 'Hindia', 'lofi indonesia', 'Tulus'];

function SearchView() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [results, setResults] = useState<Track[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setStatus('idle');
      return;
    }
    const ctl = new AbortController();
    setStatus('loading');
    const t = setTimeout(() => {
      searchTracks(term, 20, ctl.signal)
        .then((r) => {
          setResults(r);
          setStatus('ok');
        })
        .catch((e) => {
          if (e?.name !== 'AbortError') setStatus('error');
        });
    }, 450);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

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
          autoFocus={!params.get('q')}
        />
        {q ? (
          <button type="button" aria-label="Hapus" onClick={() => setQ('')}>
            <X size={20} />
          </button>
        ) : null}
      </div>

      {status === 'idle' && (
        <div className="chips" style={{ marginTop: 22 }}>
          {SUGGEST.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => setQ(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {status === 'loading' && <p className="greeting-sub" style={{ marginTop: 24 }}>Mencari...</p>}
      {status === 'error' && (
        <p className="greeting-sub" style={{ marginTop: 24 }}>
          Pencarian belum bisa dilakukan. Coba lagi sebentar lagi.
        </p>
      )}
      {status === 'ok' && results.length === 0 && (
        <p className="greeting-sub" style={{ marginTop: 24 }}>
          Tidak ada hasil untuk &ldquo;{q.trim()}&rdquo;.
        </p>
      )}

      <div className="track-list" style={{ marginTop: 24 }}>
        {results.map((t, i) => (
          <TrackRow key={t.id} track={t} index={i} queue={results} />
        ))}
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
