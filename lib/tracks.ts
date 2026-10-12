export type Track = {
  id: string;
  title: string;
  artist: string;
  thumb?: string;
};

export const DAILY_PICKS: Track[] = [
  { id: 'sample-1', title: 'Aku Milikmu', artist: 'Dewa 19' },
  { id: 'sample-2', title: 'Salahnya Aku Dimana', artist: 'Elsa Pitaloka' },
  { id: 'sample-3', title: 'Ada titik-titik di ujung doa', artist: 'Sal Priadi' },
  { id: 'sample-4', title: 'Sedia Aku Sebelum Hujan', artist: 'Idgitaf' },
  { id: 'sample-5', title: 'Mari Menua Bersama', artist: 'Sal Priadi' },
  { id: 'sample-6', title: 'Tamu Undangan (Reggae)', artist: 'Niken Salindry' }
];

export const ON_REPEAT: Track[] = [
  { id: 'sample-3', title: 'Ada titik-titik di ujung doa', artist: 'Sal Priadi' },
  { id: 'sample-1', title: 'Aku Milikmu', artist: 'Dewa 19' },
  { id: 'sample-4', title: 'Sedia Aku Sebelum Hujan', artist: 'Idgitaf' },
  { id: 'sample-2', title: 'Salahnya Aku Dimana', artist: 'Elsa Pitaloka' }
];

export const HOME_CHIPS = [
  { id: 'all', label: 'Semua', icon: 'all' },
  { id: 'new', label: 'Rilis Baru', icon: 'sparkles' },
  { id: 'trending', label: 'Trending', icon: 'trending' },
  { id: 'top', label: 'Top Hits', icon: 'music' },
  { id: 'chill', label: 'Santai', icon: 'moon' },
  { id: 'focus', label: 'Fokus', icon: 'audio' }
];
