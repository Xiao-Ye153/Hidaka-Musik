'use client';

import '../app/level.css';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import { fbApp } from '@/lib/firebase';
import { computeLevelInfo } from '@/lib/level';
import { useAuth } from './AuthProvider';
import { usePlayer } from './Providers';

type Ctx = {
  active: boolean;
  points: number;
  level: { level: number; into: number; need: number };
};

const C = createContext<Ctx | null>(null);

export function useProgress2() {
  const c = useContext(C);
  if (!c) throw new Error('ProgressContext');
  return c;
}

export default function ProgressProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const { playing } = usePlayer();
  const uid = user?.uid ?? null;

  const [points, setPoints] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState('');
  const sec = useRef(0);
  const pts = useRef(0);
  const dirty = useRef(false);

  const persist = useCallback(() => {
    if (!uid) return;
    try {
      localStorage.setItem(`hm_lvl_${uid}`, JSON.stringify({ sec: sec.current, pts: pts.current }));
    } catch {}
  }, [uid]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    dirty.current = false;
    if (!uid) {
      sec.current = 0;
      pts.current = 0;
      setPoints(0);
      setLoaded(false);
      return;
    }
    try {
      const raw = localStorage.getItem(`hm_lvl_${uid}`);
      const o = raw ? JSON.parse(raw) : {};
      sec.current = Number(o.sec) || 0;
      pts.current = Number(o.pts) || 0;
    } catch {
      sec.current = 0;
      pts.current = 0;
    }
    setPoints(pts.current);
    setLoaded(true);
  }, [uid]);

  useEffect(() => {
    if (!uid || !loaded || !profile) return;
    const sp = typeof profile.levelPoints === 'number' ? profile.levelPoints : 0;
    if (sp > pts.current) {
      pts.current = sp;
      setPoints(sp);
      persist();
    } else if (pts.current > sp) {
      dirty.current = true;
      setDoc(doc(getFirestore(fbApp()), 'user_profiles', uid), { levelPoints: pts.current }, { merge: true }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, loaded, profile?.levelPoints]);

  useEffect(() => {
    if (!uid || !loaded || !dirty.current) return;
    const id = setTimeout(() => {
      dirty.current = false;
      setDoc(doc(getFirestore(fbApp()), 'user_profiles', uid), { levelPoints: pts.current }, { merge: true }).catch(() => {});
    }, 2000);
    return () => clearTimeout(id);
  }, [uid, loaded, points]);

  useEffect(() => {
    if (!uid || !loaded || !playing) return;
    const id = setInterval(() => {
      sec.current += 1;
      if (sec.current % 600 === 0) {
        const before = computeLevelInfo(pts.current).level;
        pts.current += 5;
        const after = computeLevelInfo(pts.current).level;
        dirty.current = true;
        setPoints(pts.current);
        if (after > before) setToast(`🎉 Level Up! Sekarang Lv.${after}`);
        persist();
      } else if (sec.current % 30 === 0) {
        persist();
      }
    }, 1000);
    return () => {
      clearInterval(id);
      persist();
    };
  }, [uid, loaded, playing, persist]);

  const level = useMemo(() => computeLevelInfo(points), [points]);
  const value = useMemo<Ctx>(() => ({ active: !!uid && loaded, points, level }), [uid, loaded, points, level]);

  return (
    <C.Provider value={value}>
      {children}
      {toast ? <div className="ms-toast">{toast}</div> : null}
    </C.Provider>
  );
}
