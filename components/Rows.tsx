'use client';

import '../app/home.css';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { searchTracks } from '@/lib/api';
import type { Track } from '@/lib/tracks';
import { usePlayer } from './Providers';
import TrackThumb from './TrackThumb';
import { useI18n } from '@/components/I18nProvider';

export function Spin() {
  return (
    <div className="hs-spin">
      <div className="spin" />
    </div>
  );
}

export function HRow({ tracks, variant = 'card' }: { tracks: Track[]; variant?: 'card' | 'video' }) {
  const { play } = usePlayer();
  return (
    <div className="hrow">
      {tracks.map((t) => (
        <button key={t.id} type="button" className={variant === 'video' ? 'vcard' : 'hcard'} onClick={() => play(t, tracks)}>
          <TrackThumb track={t} className={variant === 'video' ? 'vimg' : 'himg'} />
          <div className="hcard-title">{t.title}</div>
          <div className="hcard-sub">{t.artist}</div>
        </button>
      ))}
    </div>
  );
}

export function ArtistRow({ tracks }: { tracks: Track[] }) {
  const { t: tr } = useI18n();
  const seen = new Set<string>();
  const list: Track[] = [];
  for (const t of tracks) {
    if (t.artist && !seen.has(t.artist)) {
      seen.add(t.artist);
      list.push(t);
    }
    if (list.length >= 6) break;
  }
  return (
    <div className="hrow">
      {list.map((t) => (
        <Link key={t.artist} href={`/artist?name=${encodeURIComponent(t.artist)}`} className="acard">
          <TrackThumb track={t} className="aimg" />
          <div className="hcard-title">{t.artist}</div>
          <div className="hcard-sub">{tr("Artis")}</div>
        </Link>
      ))}
    </div>
  );
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          io.disconnect();
          setSeen(true);
        }
      },
      { rootMargin: '400px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return { ref, seen };
}

export function LazyRow({
  title,
  q,
  max = 8,
  variant = 'card'
}: {
  title: string;
  q: string;
  max?: number;
  variant?: 'card' | 'video';
}) {
  const { ref, seen } = useInView<HTMLElement>();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!seen) return;
    const ctl = new AbortController();
    searchTracks(q, max, ctl.signal)
      .then(setTracks)
      .catch((e) => {
        if (e?.name !== 'AbortError') setFailed(true);
      });
    return () => ctl.abort();
  }, [seen, q, max]);

  if (failed || (tracks && tracks.length === 0)) return null;

  return (
    <section className="hs" ref={ref}>
      <div className="hs-head">
        <h2 className="hs-title">{title}</h2>
      </div>
      {tracks ? <HRow tracks={tracks} variant={variant} /> : <Spin />}
    </section>
  );
}

export function CommunityRow({ items }: { items: { title: string; q: string }[] }) {
  const { t: tr } = useI18n();
  const { play } = usePlayer();
  const { ref, seen } = useInView<HTMLElement>();
  const [cards, setCards] = useState<{ title: string; tracks: Track[] }[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!seen) return;
    let cancelled = false;
    (async () => {
      for (const it of items) {
        if (cancelled) return;
        try {
          const tracks = await searchTracks(it.q, 8);
          if (cancelled) return;
          if (tracks.length) setCards((c) => [...c, { title: it.title, tracks }]);
        } catch {}
        await new Promise((r) => setTimeout(r, 500));
      }
      if (!cancelled) setDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [seen, items]);

  if (done && cards.length === 0) return null;

  return (
    <section className="hs" ref={ref}>
      <div className="hs-head">
        <h2 className="hs-title">{tr("From the community")}</h2>
      </div>
      {cards.length === 0 ? (
        <Spin />
      ) : (
        <div className="hrow">
          {cards.map((c) => (
            <button key={c.title} type="button" className="ccard glass-soft" onClick={() => play(c.tracks[0], c.tracks)}>
              <TrackThumb track={c.tracks[0]} className="ccard-art" />
              <div className="ccard-title">{c.title}</div>
              {c.tracks.slice(0, 3).map((t) => (
                <div key={t.id} className="ccard-line">
                  {t.title}
                </div>
              ))}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
