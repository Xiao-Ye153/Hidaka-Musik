'use client';

import { Heart, Loader2, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { usePlayer, useProgress } from './Providers';
import TrackThumb from './TrackThumb';

export default function MiniPlayer() {
  const { current, playing, buffering, toggle, next, prev, close, isLiked, toggleLike } = usePlayer();
  const { time, duration } = useProgress();
  if (!current) return null;
  const liked = isLiked(current.id);
  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

  return (
    <div className={`mini glass${playing ? ' playing' : ''}`}>
      <TrackThumb track={current} className="thumb sm" />
      <div className="row-body">
        <div className="row-title" style={{ fontSize: 15 }}>
          {current.title}
        </div>
        <div className="row-sub" style={{ fontSize: 13, marginTop: 3 }}>
          {current.artist}
        </div>
      </div>
      <div className="mini-ctrl">
        <button type="button" onClick={prev} aria-label="Sebelumnya">
          <SkipBack size={18} fill="currentColor" />
        </button>
        <button type="button" className="mini-play" onClick={toggle} aria-label={playing ? 'Jeda' : 'Putar'}>
          {buffering ? (
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          ) : playing ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" />
          )}
        </button>
        <button type="button" onClick={next} aria-label="Berikutnya">
          <SkipForward size={18} fill="currentColor" />
        </button>
        <button
          type="button"
          onClick={() => toggleLike(current)}
          aria-label="Suka"
          className={liked ? 'liked-on' : ''}
        >
          <Heart size={19} fill={liked ? 'currentColor' : 'none'} />
        </button>
        <button type="button" onClick={close} aria-label="Tutup">
          <X size={19} />
        </button>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 18,
          right: 18,
          bottom: 5,
          height: 3,
          borderRadius: 2,
          background: 'color-mix(in srgb, var(--text) 14%, transparent)',
          overflow: 'hidden'
        }}
      >
        <i
          style={{
            display: 'block',
            height: '100%',
            width: `${pct}%`,
            borderRadius: 2,
            background: 'linear-gradient(90deg, var(--accent), var(--accent2))'
          }}
        />
      </div>
    </div>
  );
}
