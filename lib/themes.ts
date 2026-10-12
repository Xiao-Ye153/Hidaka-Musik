export type ThemeId = 'dark' | 'light' | 'sea' | 'purple' | 'star';

export type ThemeOption = {
  id: ThemeId;
  label: string;
  desc: string;
  base: string;
  accent: string;
};

export const THEMES: ThemeOption[] = [
  { id: 'dark', label: 'Dark', desc: 'Hitam & Oranye', base: '#0b0b0d', accent: '#ff7a1a' },
  { id: 'light', label: 'Light', desc: 'Terang & Bersih', base: '#f6f5f3', accent: '#ff6a00' },
  { id: 'sea', label: 'Sea', desc: 'Biru Kehijauan', base: '#04161e', accent: '#22d3ee' },
  { id: 'purple', label: 'Purple', desc: 'Ungu Elegan', base: '#120a1d', accent: '#a855f7' },
  { id: 'star', label: 'Star', desc: 'Langit Malam & Emas', base: '#070a1a', accent: '#f5c542' }
];

export const THEME_KEY = 'hm_theme';
