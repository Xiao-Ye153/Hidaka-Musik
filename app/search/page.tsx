'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Flame, Globe, Moon, Play, Search as SearchIcon, Sparkles, X } from 'lucide-react';
import { usePlayer } from '@/components/Providers';
import TrackRow from '@/components/TrackRow';
import TrackThumb from '@/components/TrackThumb';
import { searchTracks } from '@/lib/api';
import type { Track } from '@/lib/tracks';

const SECTIONS = [
  { title: 'Rilis Anyar', Icon: Sparkles, color: '#facc15', q: 'lagu indonesia rilis terbaru 2025' },
  { title: 'Barat Top', Icon: Globe, color: '#38bdf8', q: 'top english pop hits 2025' },
  { title: 'Rapp Top', Icon: Flame, color: '#fb923c', q: 'rap indonesia terbaru top' },
  { title: 'Indie Pilihan', Icon: Sparkles, color: '#a78bfa', q: 'indie indonesia terpopuler' },
  { title: 'Santai Dulu', Icon: Moon, color: '#34d399', q: 'lagu santai indonesia chill' }
];

function Browse() {
  const { play } = usePlayer();
  const [rows, setRows] = useState<Record<string, Track[]>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const s of SECTIONS) {
        if (cancelled) return;
        try {
          const r = await searchTracks(s.q, 10);
          if (!cancelled) setRows((prev) => ({ ...prev, [s.title]: r }));
        } catch {}
        await new Promise((res) => setTimeout(res, 350));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {SECTIONS.map(({ title, Icon, color }) => {
        const list = rows[title];
        if (!list || list.length === 0) return null;
        return (
          <section key={title} className="s-sec">
            <div className="s-head">
              <Icon size={20} color={color} />
              {title}
            </div>
            <div className="hrow">
              {list.map((t) => (
                <button key={t.id} type="button" className="s-card glass-soft" onClick={() => play(t, list)}>
                  <div className="s-art">
                    <TrackThumb track={t} className="s-art-in" />
                    <span className="s-play">
                      <Play size={14} fill="currentColor" />
                    </span>
                  </div>
                  <div className="hcard-title">{t.title}</div>
                  <div className="hcard-sub">{t.artist}</div>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

function SearchView() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [term, setTerm] = useState(params.get('q') ?? '');
  const [results, setResults] = useState<Track[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  useEffect(() => {
    const t = q.trim();
    const id = setTimeout(() => setTerm(t), 450);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    if (term.length < 2) {
      setResults([]);
      setStatus('idle');
      return;
    }
    const ctl = new AbortController();
    setStatus('loading');
    searchTracks(term, 20, ctl.signal)
      .then((r) => {
        setResults(r);
        setStatus('ok');
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setStatus('error');
      });
    return () => ctl.abort();
  }, [term]);

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
          onKeyDown={(e) => e.key === 'Enter' && setTerm(q.trim())}
        />
        {q ? (
          <button type="button" aria-label="Hapus" onClick={() => setQ('')}>
            <X size={20} />
          </button>
        ) : null}
        <button type="button" className="s-go" onClick={() => setTerm(q.trim())}>
          Cari
        </button>
      </div>

      {status === 'idle' && <Browse />}

      {status === 'loading' && <p className="greeting-sub" style={{ marginTop: 24 }}>Mencari...</p>}
      {status === 'error' && (
        <p className="greeting-sub" style={{ marginTop: 24 }}>
          Pencarian belum bisa dilakukan. Coba lagi sebentar lagi.
        </p>
      )}
      {status === 'ok' && results.length === 0 && (
        <p className="greeting-sub" style={{ marginTop: 24 }}>
          Tidak ada hasil untuk &ldquo;{term}&rdquo;.
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
