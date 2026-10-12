export type Track = {
  id: string;
  title: string;
  artist: string;
  thumb?: string;
};

export const HOME_CHIPS = [
  { id: 'all', label: 'Semua', icon: 'all', q: 'lagu indonesia populer' },
  { id: 'new', label: 'Rilis Baru', icon: 'sparkles', q: 'lagu indonesia rilis terbaru' },
  { id: 'trending', label: 'Trending', icon: 'trending', q: 'lagu trending indonesia' },
  { id: 'top', label: 'Top Hits', icon: 'music', q: 'top hits indonesia' },
  { id: 'chill', label: 'Santai', icon: 'moon', q: 'lagu santai indonesia' },
  { id: 'focus', label: 'Fokus', icon: 'audio', q: 'musik fokus instrumental' }
];
