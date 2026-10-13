'use client';

import '../app/home.css';
import { Pause, Play } from 'lucide-react';
import { hiRes, cleanArtistName } from '@/lib/api';
import { COMMUNITY, HOME_SECTIONS, type Track } from '@/lib/tracks';
import { usePlayer } from './Providers';
import { ArtistRow, CommunityRow, HRow, LazyRow } from './Rows';
import TrackThumb from './TrackThumb';

export function Featured({ tracks }: { tracks: Track[] }) {
  const { current, playing, play, toggle } = usePlayer();
  const slides = tracks.slice(0, 5);
  if (slides.length === 0) return null;
  return (
    <section className="hs">
      <div className="featured">
        {slides.map((t) => {
          const now = current?.id === t.id;
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              className="fslide"
              onClick={() => (now ? toggle() : play(t, tracks))}
              onKeyDown={(e) => e.key === 'Enter' && (now ? toggle() : play(t, tracks))}
            >
              <div className="fslide-bg" style={{ backgroundImage: t.thumb ? `url(${hiRes(t.thumb)})` : undefined }} />
              <div className="fslide-ov" />
              <div className="fslide-body">
                <div className="fslide-label">🔥 Trending Sekarang</div>
                <div className="fslide-title">{t.title}</div>
                <div className="fslide-sub">{t.artist}</div>
              </div>
              <span className="fslide-play">
                {now && playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function SpeedDial({ tracks }: { tracks: Track[] }) {
  const { play } = usePlayer();
  if (tracks.length === 0) return null;
  return (
    <section className="hs">
      <div className="hs-head">
        <h2 className="hs-title">Speed dial</h2>
      </div>
      <div className="speed">
        {tracks.slice(0, 9).map((t) => (
          <button key={t.id} type="button" className="speed-tile" onClick={() => play(t, tracks)}>
            <TrackThumb track={t} className="himg" />
            <span className="speed-label">{t.title}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function MoreSections({ tracks }: { tracks: Track[] }) {
  const artists: string[] = [];
  for (const t of tracks) {
    if (t.artist && !artists.includes(t.artist)) artists.push(t.artist);
    if (artists.length >= 3) break;
  }
  const trending = tracks.slice(0, 8);
  const fresh = tracks.slice(8, 16);

  return (
    <>
      {tracks.length > 0 && (
        <section className="hs">
          <div className="hs-head">
            <h2 className="hs-title">Tetap mendengarkan</h2>
          </div>
          <ArtistRow tracks={tracks} />
        </section>
      )}

      {trending.length > 0 && (
        <section className="hs">
          <div className="hs-head">
            <h2 className="hs-title">Trending Now</h2>
          </div>
          <HRow tracks={trending} />
        </section>
      )}

      {fresh.length > 0 && (
        <section className="hs">
          <div className="hs-head">
            <h2 className="hs-title">New Releases</h2>
          </div>
          <HRow tracks={fresh} />
        </section>
      )}

      {HOME_SECTIONS.map((s) => (
        <LazyRow key={s.title} title={s.title} q={s.q} />
      ))}

      <CommunityRow items={COMMUNITY} />

      {artists.map((a) => (
        <LazyRow key={a} title={`Serupa dengan ${a}`} q={`${cleanArtistName(a) || a} similar artists mix`} max={6} />
      ))}
    </>
  );
}
