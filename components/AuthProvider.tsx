'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  sendPasswordResetEmail,
  signInWithRedirect,
  signOut,
  updateProfile,
  type ConfirmationResult,
  type User
} from 'firebase/auth';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  artistsFromCloud,
  artistsToCloud,
  mergePlaylists,
  mergeTracks,
  playlistsFromCloud,
  playlistsToCloud,
  toCloudTrack,
  tracksFromCloud,
  type CloudArtist
} from '@/lib/cloud';
import { fbApp } from '@/lib/firebase';
import { useExtras } from './Extras';
import { usePlayer } from './Providers';

type AuthCtx = {
  user: User | null;
  ready: boolean;
  synced: boolean;
  handle: string;
  photo: string | null;
  loginGoogle: () => Promise<string | null>;
  loginEmail: (email: string, pass: string) => Promise<string | null>;
  registerEmail: (name: string, email: string, pass: string) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  sendPhoneCode: (phone: string) => Promise<string | null>;
  confirmPhoneCode: (code: string) => Promise<string | null>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('AuthContext');
  return c;
}

function message(e: unknown) {
  const code = (e as { code?: string })?.code || '';
  const map: Record<string, string> = {
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/missing-email': 'Isi email dulu.',
    'auth/missing-password': 'Isi password dulu.',
    'auth/weak-password': 'Password minimal 6 karakter.',
    'auth/email-already-in-use': 'Email sudah terdaftar. Coba masuk.',
    'auth/user-not-found': 'Akun tidak ditemukan.',
    'auth/wrong-password': 'Password salah.',
    'auth/invalid-credential': 'Email atau password salah.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi nanti.',
    'auth/network-request-failed': 'Koneksi bermasalah. Coba lagi.',
    'auth/popup-closed-by-user': 'Login dibatalkan.',
    'auth/cancelled-popup-request': 'Login dibatalkan.',
    'auth/unauthorized-domain': 'Domain ini belum diizinkan di Firebase (Authentication → Settings → Authorized domains).',
    'auth/invalid-phone-number': 'Nomor HP tidak valid.',
    'auth/invalid-verification-code': 'Kode salah.',
    'auth/code-expired': 'Kode kedaluwarsa. Kirim ulang.',
    'auth/quota-exceeded': 'Kuota SMS habis. Coba cara lain.',
    'auth/operation-not-allowed': 'Metode login ini belum diaktifkan di Firebase.'
  };
  return map[code] || 'Terjadi kesalahan. Coba lagi.';
}

function normalizePhone(raw: string) {
  const s = raw.replace(/[\s-]/g, '');
  if (s.startsWith('+')) return s;
  if (s.startsWith('0')) return `+62${s.slice(1)}`;
  if (s.startsWith('62')) return `+${s}`;
  return `+62${s}`;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const { liked, recent, setLikedAll, setRecentAll } = usePlayer();
  const { playlists, artists, setPlaylistsAll, setArtistsAll } = useExtras();

  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [synced, setSynced] = useState(false);
  const [rev, setRev] = useState(0);

  const confirmRef = useRef<ConfirmationResult | null>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const metaRef = useRef<Record<string, CloudArtist>>({});
  const localRef = useRef({ liked, recent, playlists, artists });
  localRef.current = { liked, recent, playlists, artists };

  useEffect(() => {
    const auth = getAuth(fbApp());
    getRedirectResult(auth).catch(() => {});
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!uid || !user) {
      setSynced(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const db = getFirestore(fbApp());
        const pref = doc(db, 'user_profiles', uid);
        const ps = await getDoc(pref);
        if (!ps.exists()) {
          await setDoc(pref, {
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            photoURL: user.photoURL || null,
            bio: '',
            commentCount: 0,
            likeCount: 0,
            followerCount: 0,
            followingCount: 0,
            joinedAt: serverTimestamp()
          });
        } else {
          const d = ps.data();
          const patch: Record<string, string> = {};
          if (user.displayName && user.displayName !== d.displayName) patch.displayName = user.displayName;
          if (user.photoURL && user.photoURL !== d.photoURL) patch.photoURL = user.photoURL;
          if (Object.keys(patch).length) await setDoc(pref, patch, { merge: true });
        }

        const snap = await getDoc(doc(db, 'users', uid));
        const d = snap.exists() ? snap.data() : {};
        if (cancelled) return;
        const local = localRef.current;
        const ar = artistsFromCloud(d.subscribed);
        metaRef.current = ar.meta;

        setLikedAll(mergeTracks(tracksFromCloud(d.liked), local.liked));
        setRecentAll(mergeTracks(tracksFromCloud(d.history), local.recent).slice(0, 50));
        setPlaylistsAll(mergePlaylists(playlistsFromCloud(d.playlists), local.playlists));
        setArtistsAll(Array.from(new Set([...ar.names, ...local.artists])));
        setSynced(true);
      } catch {
        setSynced(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    if (!uid || !synced) return;
    const id = setTimeout(() => {
      const db = getFirestore(fbApp());
      setDoc(
        doc(db, 'users', uid),
        {
          liked: JSON.stringify(liked.map(toCloudTrack)),
          history: JSON.stringify(recent.slice(0, 50).map(toCloudTrack)),
          playlists: JSON.stringify(playlistsToCloud(playlists)),
          subscribed: JSON.stringify(artistsToCloud(artists, metaRef.current))
        },
        { merge: true }
      ).catch(() => {});
    }, 1500);
    return () => clearTimeout(id);
  }, [uid, synced, liked, recent, playlists, artists]);

  const loginGoogle = useCallback(async () => {
    const auth = getAuth(fbApp());
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      return null;
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, provider);
          return null;
        } catch (e2) {
          return message(e2);
        }
      }
      return message(e);
    }
  }, []);

  const loginEmail = useCallback(async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(getAuth(fbApp()), email.trim(), pass);
      return null;
    } catch (e) {
      return message(e);
    }
  }, []);

  const registerEmail = useCallback(async (name: string, email: string, pass: string) => {
    try {
      const auth = getAuth(fbApp());
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const nm = name.trim();
      if (nm) {
        await updateProfile(cred.user, { displayName: nm });
        setDoc(doc(getFirestore(fbApp()), 'user_profiles', cred.user.uid), { displayName: nm }, { merge: true }).catch(() => {});
        setRev((r) => r + 1);
      }
      return null;
    } catch (e) {
      return message(e);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(getAuth(fbApp()), email.trim());
      return null;
    } catch (e) {
      return message(e);
    }
  }, []);

  const sendPhoneCode = useCallback(async (phone: string) => {
    try {
      const auth = getAuth(fbApp());
      if (!verifierRef.current) {
        verifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-box', { size: 'invisible' });
      }
      confirmRef.current = await signInWithPhoneNumber(auth, normalizePhone(phone), verifierRef.current);
      return null;
    } catch (e) {
      try {
        verifierRef.current?.clear();
      } catch {}
      verifierRef.current = null;
      return message(e);
    }
  }, []);

  const confirmPhoneCode = useCallback(async (code: string) => {
    if (!confirmRef.current) return 'Kirim kode dulu.';
    try {
      await confirmRef.current.confirm(code.trim());
      return null;
    } catch (e) {
      return message(e);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(getAuth(fbApp()));
    setSynced(false);
    metaRef.current = {};
    setLikedAll([]);
    setRecentAll([]);
    setPlaylistsAll([]);
    setArtistsAll([]);
  }, [setLikedAll, setRecentAll, setPlaylistsAll, setArtistsAll]);

  const handle = useMemo(() => {
    const base = user?.displayName || user?.email?.split('@')[0] || user?.phoneNumber || 'tamu';
    return base.toLowerCase().replace(/\s+/g, '') || 'tamu';
  }, [user, rev]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      ready,
      synced,
      handle,
      photo: user?.photoURL ?? null,
      loginGoogle,
      loginEmail,
      registerEmail,
      resetPassword,
      sendPhoneCode,
      confirmPhoneCode,
      logout
    }),
    [user, ready, synced, handle, loginGoogle, loginEmail, registerEmail, resetPassword, sendPhoneCode, confirmPhoneCode, logout, rev]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
