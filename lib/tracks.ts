export type Track = {
  id: string;
  title: string;
  artist: string;
  thumb?: string;
};

export const HOME_CHIPS = [
  { id: 'all', label: 'Semua', icon: 'all', q: '' },
  { id: 'new', label: 'Rilis Baru', icon: 'sparkles', q: 'lagu indonesia rilis terbaru' },
  { id: 'trending', label: 'Trending', icon: 'trending', q: 'lagu trending indonesia' },
  { id: 'top', label: 'Top Hits', icon: 'music', q: 'top hits indonesia' },
  { id: 'chill', label: 'Chill', icon: 'moon', q: 'chill relax music playlist' },
  { id: 'focus', label: 'Focus', icon: 'audio', q: 'focus study music lofi' },
  { id: 'commute', label: 'Commute', icon: 'none', q: 'commute music playlist' },
  { id: 'gaming', label: 'Gaming', icon: 'none', q: 'gaming music epic' },
  { id: 'popid', label: 'Pop Indonesia', icon: 'none', q: 'kunto aji maliq d essentials tejana lagu populer' },
  { id: 'nadin', label: 'Nadin Amizah', icon: 'none', q: 'nadin amizah official music video' },
  { id: 'pamungkas', label: 'Pamungkas', icon: 'none', q: 'pamungkas official music video' },
  { id: 'hindia', label: 'Hindia', icon: 'none', q: 'hindia official music video lagu' },
  { id: 'tulus', label: 'Tulus', icon: 'none', q: 'tulus official music video' },
  { id: 'raisa', label: 'Raisa', icon: 'none', q: 'raisa official music video lagu populer' },
  { id: 'rizky', label: 'Rizky Febian', icon: 'none', q: 'rizky febian official music video' },
  { id: 'tiara', label: 'Tiara Andini', icon: 'none', q: 'tiara andini official music video' },
  { id: 'indie', label: 'Indie Indo', icon: 'none', q: 'bedroom pop indonesia indie official' },
  { id: 'rock', label: 'Rock Indo', icon: 'none', q: 'the rain noah band noah official music' },
  { id: 'lofi', label: 'Lo-Fi', icon: 'none', q: 'lofi chill hip hop beats official' },
  { id: 'taylor', label: 'Taylor Swift', icon: 'none', q: 'taylor swift official music video' },
  { id: 'billie', label: 'Billie Eilish', icon: 'none', q: 'billie eilish official music video' },
  { id: 'weeknd', label: 'The Weeknd', icon: 'none', q: 'the weeknd official music video' }
];

export const HOME_QUERIES = [
  'nadin amizah pamungkas hindia popular songs',
  'lagu indonesia viral 2025 spotify',
  'top hits indonesia terbaru 2025',
  'indie indonesia terpopuler 2024',
  'lagu galau indonesia terbaru',
  'pop indonesia hits pamungkas raisa',
  'trending music indonesia 2025',
  'lagu santai indonesia chill',
  'for revenge hindia weird genius indonesia',
  'lagu romantis indonesia terpopuler'
];

export const HOME_SECTIONS = [
  { title: 'Viral on TikTok', q: 'viral tiktok indonesia 2025 lagu populer' },
  { title: 'Surrender to the Beat', q: 'dance electronic beat drop 2024' },
  { title: 'Fun Throwbacks', q: 'throwback hits 90s 2000s classic' },
  { title: 'Feel-good Rock', q: 'feel good rock alternative hits' },
  { title: 'Acoustic Chill', q: 'acoustic chill guitar indie folk' },
  { title: 'Top 50 Indonesia', q: 'top 50 indonesia spotify chart 2025' }
];

export const COMMUNITY = [
  { title: 'Chill Rap 🏙️', q: 'chill rap hip hop playlist' },
  { title: 'Pop Hits 🎵', q: 'pop hits 2024 playlist' },
  { title: 'Indie Vibes 🌿', q: 'indie alternative playlist' },
  { title: 'R&B Soul ✨', q: 'rnb soul playlist 2024' },
  { title: 'Lo-Fi Study 📚', q: 'lofi hip hop study beats playlist' },
  { title: 'Rock Anthems 🎸', q: 'rock anthems classic hits playlist' },
  { title: 'Dance Floor 🕺', q: 'dance electronic edm playlist 2024' },
  { title: 'Throwback 🕰️', q: 'throwback 90s 2000s hits playlist' }
];
