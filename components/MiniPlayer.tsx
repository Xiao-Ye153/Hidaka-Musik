'use client';

import { Heart, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { usePlayer } from './Providers';
import TrackThumb from './TrackThumb';

export default function MiniPlayer() {
  const { current, playing, toggle, next, prev, close, isLiked, toggleLike } = usePlayer();
  if (!current) return null;
  const liked = isLiked(current.id);

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
          {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
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
    </div>
  );
}
