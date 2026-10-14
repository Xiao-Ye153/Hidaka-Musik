export const ROLE_TIERS = [
  { min: 0, name: 'Pendengar' },
  { min: 10, name: 'Pendengar Aktif' },
  { min: 20, name: 'Komentator' },
  { min: 30, name: 'Komentator Rajin' },
  { min: 40, name: 'Kontributor' },
  { min: 50, name: 'Kontributor Setia' },
  { min: 60, name: 'Legenda Komentar' },
  { min: 70, name: 'Master Komentar' },
  { min: 80, name: 'Sesepuh' },
  { min: 90, name: 'Veteran Sejati' }
];

export function roleFor(commentCount: number) {
  let name = ROLE_TIERS[0].name;
  for (const t of ROLE_TIERS) if (commentCount >= t.min) name = t.name;
  return name;
}

export function timeAgo(ts: number) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  const h = Math.floor(d / 3600000);
  const dy = Math.floor(d / 86400000);
  if (m < 1) return 'Baru saja';
  if (m < 60) return `${m} menit lalu`;
  if (h < 24) return `${h} jam lalu`;
  if (dy < 30) return `${dy} hari lalu`;
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}
