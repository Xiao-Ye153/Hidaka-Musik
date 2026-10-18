import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { fbApp } from './firebase';

const mem = new Map<string, string>();

function keyOf(name: string, lang: string) {
  return (name.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 90) + '__' + lang).slice(0, 100);
}

export async function getArtistBio(name: string, uid: string | null, lang = 'id'): Promise<string> {
  const k = keyOf(name, lang);
  const hit = mem.get(k);
  if (hit) return hit;

  try {
    const local = localStorage.getItem(`hm_bio_${k}`);
    if (local) {
      mem.set(k, local);
      return local;
    }
  } catch {}

  if (uid) {
    try {
      const snap = await getDoc(doc(getFirestore(fbApp()), 'users', uid, 'artist_bios', k));
      const b = snap.exists() ? (snap.data().bio as string) : '';
      if (b) {
        mem.set(k, b);
        try {
          localStorage.setItem(`hm_bio_${k}`, b);
        } catch {}
        return b;
      }
    } catch {}
  }

  const res = await fetch(`/api/artist-about?name=${encodeURIComponent(name)}&lang=${lang}`);
  const data = await res.json().catch(() => null);
  const bio: string = data?.bio || '';
  if (bio) {
    mem.set(k, bio);
    try {
      localStorage.setItem(`hm_bio_${k}`, bio);
    } catch {}
    if (uid) {
      setDoc(doc(getFirestore(fbApp()), 'users', uid, 'artist_bios', k), { bio, artistName: name, savedAt: Date.now() }).catch(() => {});
    }
  }
  return bio;
}
