import type { Track } from '@/lib/tracks';

const PALETTE = [
  ['#7c3aed', '#2563eb'],
  ['#f97316', '#db2777'],
  ['#0891b2', '#16a34a'],
  ['#ca8a04', '#dc2626'],
  ['#db2777', '#7c3aed'],
  ['#2563eb', '#0d9488']
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function TrackThumb({ track, className }: { track: Track; className?: string }) {
  if (track.thumb) {
    return (
      <div className={className}>
        <img src={track.thumb} alt="" loading="lazy" />
      </div>
    );
  }
  const [a, b] = PALETTE[hash(track.id + track.title) % PALETTE.length];
  return (
    <div className={className} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
      {track.title.trim().charAt(0).toUpperCase()}
    </div>
  );
}
