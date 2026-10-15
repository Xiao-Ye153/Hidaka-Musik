export type FavSong = { id: string; title: string; artist: string; thumb?: string };
export type ShownPl = { name: string; count: number; thumb?: string };

export type Profile = {
  displayName?: string;
  photoURL?: string | null;
  bio?: string;
  commentCount?: number;
  likeCount?: number;
  levelPoints?: number;
  roleOverride?: string;
  bannerThemeId?: string;
  favSongs?: FavSong[];
  shownPlaylists?: ShownPl[];
  gallery?: string[];
};

export function resizeImage(file: File, max: number, quality = 0.7, square = false): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File harus gambar'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Gagal membaca gambar'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas tidak tersedia'));
          return;
        }
        if (square) {
          const s = Math.min(img.width, img.height);
          canvas.width = max;
          canvas.height = max;
          ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, max, max);
        } else {
          const k = Math.min(1, max / Math.max(img.width, img.height));
          canvas.width = Math.round(img.width * k);
          canvas.height = Math.round(img.height * k);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
