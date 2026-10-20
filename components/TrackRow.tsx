'use client';

import '../app/home.css';
import { MoreVertical, Pause, Play } from 'lucide-react';
import type { Track } from '@/lib/tracks';
import { useExtras } from './Extras';
import { usePlayer } from './Providers';
import TrackThumb from './TrackThumb';
import { useI18n } from '@/components/I18nProvider';

export default function TrackRow({ track, index, queue }: { track: Track; index: number; queue: Track[] }) {
  const { t: tr } = useI18n();
  const { current, playing, play, toggle } = usePlayer();
  const { openPicker } = useExtras();
  const now = current?.id === track.id;

  return (
    <div className={`row glass-soft${now ? ' now' : ''}`}>
      <button type="button" className="row-main" onClick={() => (now ? toggle() : play(track, queue))}>
        <span className="row-num">{String(index + 1).padStart(2, '0')}</span>
        <TrackThumb track={track} className="thumb" />
        <span className="row-body">
          <span className="row-title" style={{ display: 'block' }}>
            {track.title}
          </span>
          <span className="row-sub" style={{ display: 'block' }}>
            {track.artist}
          </span>
        </span>
        <span className="row-play">
          {now && playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </span>
      </button>
      <button type="button" className="row-more" aria-label={tr("Simpan ke playlist")} onClick={() => openPicker(track)}>
        <MoreVertical size={20} />
      </button>
    </div>
  );
}
