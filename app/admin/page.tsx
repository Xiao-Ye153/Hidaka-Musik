'use client';

import '../admin.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { collection, doc, getDocs, getFirestore, increment, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { ADMIN_UIDS } from '@/lib/config';
import { fbApp } from '@/lib/firebase';
import { computeLevelInfo, levelPointReq } from '@/lib/level';
import { ROLE_TIERS, roleFor } from '@/lib/roles';

type U = {
  uid: string;
  displayName?: string;
  photoURL?: string | null;
  bio?: string;
  coins?: number;
  levelPoints?: number;
  commentCount?: number;
  roleOverride?: string;
  joinedAt?: { seconds?: number };
};

function cumPoints(level: number) {
  let c = 0;
  for (let i = 1; i < level; i++) c += levelPointReq(i);
  return c;
}

export default function AdminPage() {
  const { user, ready } = useAuth();
  const isAdmin = !!user && ADMIN_UIDS.includes(user.uid);

  const [users, setUsers] = useState<U[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(30);
  const [coinIn, setCoinIn] = useState<Record<string, string>>({});
  const [lvlIn, setLvlIn] = useState<Record<string, string>>({});
  const [rankIn, setRankIn] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(''), 2600);
    return () => clearTimeout(id);
  }, [note]);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const snap = await getDocs(collection(getFirestore(fbApp()), 'user_profiles'));
      const list: U[] = [];
      snap.forEach((d) => list.push({ uid: d.id, ...(d.data() as Omit<U, 'uid'>) }));
      list.sort((a, b) => (b.joinedAt?.seconds || 0) - (a.joinedAt?.seconds || 0));
      setUsers(list);
      setState('ok');
    } catch (e) {
      setErr((e as { code?: string }).code || 'gagal');
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const patch = (uid: string, p: Partial<U>) => setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, ...p } : u)));
  const ref = (uid: string) => doc(getFirestore(fbApp()), 'user_profiles', uid);

  const grantCoins = async (uid: string) => {
    const n = parseInt(coinIn[uid] || '', 10);
    if (!n || n <= 0) return setNote('Masukkan jumlah koin yang valid');
    try {
      await updateDoc(ref(uid), { coins: increment(n) });
      patch(uid, { coins: (users.find((u) => u.uid === uid)?.coins || 0) + n });
      setCoinIn((p) => ({ ...p, [uid]: '' }));
      setNote(`+${n} koin diberikan`);
    } catch (e) {
      setNote(`Gagal: ${(e as { code?: string }).code || 'error'}`);
    }
  };

  const setLevel = async (uid: string) => {
    const lv = parseInt(lvlIn[uid] || '', 10);
    if (!lv || lv < 1 || lv > 100) return setNote('Masukkan level 1-100');
    const pts = cumPoints(lv);
    try {
      await updateDoc(ref(uid), { levelPoints: pts });
      patch(uid, { levelPoints: pts });
      setLvlIn((p) => ({ ...p, [uid]: '' }));
      setNote(`Level diubah ke ${lv}`);
    } catch (e) {
      setNote(`Gagal: ${(e as { code?: string }).code || 'error'}`);
    }
  };

  const setRank = async (uid: string) => {
    const rank = rankIn[uid] || ROLE_TIERS[0].name;
    try {
      await updateDoc(ref(uid), { roleOverride: rank });
      patch(uid, { roleOverride: rank });
      setNote(`Peringkat diubah ke ${rank}`);
    } catch (e) {
      setNote(`Gagal: ${(e as { code?: string }).code || 'error'}`);
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return !s ? users : users.filter((u) => (u.displayName || '').toLowerCase().includes(s) || u.uid.toLowerCase().includes(s));
  }, [users, q]);

  const totalCoins = users.reduce((a, u) => a + (u.coins || 0), 0);
  const totalComments = users.reduce((a, u) => a + (u.commentCount || 0), 0);

  const back = (
    <div className="back-row">
      <Link href="/settings" className="round-btn" aria-label="Kembali">
        <ChevronLeft size={22} />
      </Link>
    </div>
  );

  if (!ready) return <p className="greeting-sub">Memuat...</p>;
  if (!user) {
    return (
      <>
        {back}
        <h1 className="page-title">Admin</h1>
        <p className="ad-note">Masuk dengan akun admin untuk membuka halaman ini.</p>
        <div className="big-actions">
          <Link href="/login" className="pill-btn accent">
            Masuk / Daftar
          </Link>
        </div>
      </>
    );
  }
  if (!isAdmin) {
    return (
      <>
        {back}
        <h1 className="page-title">Admin</h1>
        <p className="ad-note">
          🔒 Akun ini bukan admin.
          <br />
          UID kamu: <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{user.uid}</span>
        </p>
      </>
    );
  }

  return (
    <>
      {back}
      <h1 className="page-title">Admin Panel</h1>
      <p className="page-sub">Kelola pengguna Hidaka Music</p>

      <div className="ad-stats">
        <div className="ad-stat">
          <b>{users.length}</b>
          <span>Pengguna</span>
        </div>
        <div className="ad-stat">
          <b>{totalComments}</b>
          <span>Komentar</span>
        </div>
        <div className="ad-stat">
          <b>{totalCoins.toLocaleString('id-ID')}</b>
          <span>Total koin</span>
        </div>
      </div>

      <input className="ad-search" placeholder="Cari nama atau UID..." value={q} onChange={(e) => { setQ(e.target.value); setLimit(30); }} />

      {state === 'loading' && <p className="ad-note">Memuat pengguna...</p>}
      {state === 'error' && (
        <p className="ad-note">
          Gagal memuat data ({err}).
          <br />
          Pastikan aturan Firestore mengizinkan admin membaca user_profiles.
        </p>
      )}
      {state === 'ok' && filtered.length === 0 && <p className="ad-note">Tidak ada pengguna ditemukan.</p>}

      {filtered.slice(0, limit).map((u) => {
        const lv = computeLevelInfo(u.levelPoints || 0).level;
        return (
          <div key={u.uid} className="ad-user">
            <div className="ad-top">
              <span className="avatar" style={{ width: 44, height: 44, fontSize: 17 }}>
                {u.photoURL ? <img src={u.photoURL} alt="" referrerPolicy="no-referrer" /> : (u.displayName || '?').charAt(0).toUpperCase()}
              </span>
              <div className="ad-body">
                <div className="ad-name">{u.displayName || 'Tanpa Nama'}</div>
                <div className="ad-meta">
                  Lv.{lv} • {u.roleOverride || roleFor(u.commentCount || 0)} • {u.commentCount || 0} komentar
                </div>
                <div className="ad-uid">{u.uid}</div>
              </div>
              <div className="ad-coin">⚡ {(u.coins || 0).toLocaleString('id-ID')}</div>
            </div>

            <div className="ad-forms">
              <div className="ad-form">
                Koin
                <input type="number" placeholder="50" value={coinIn[u.uid] || ''} onChange={(e) => setCoinIn((p) => ({ ...p, [u.uid]: e.target.value }))} />
                <button type="button" onClick={() => grantCoins(u.uid)}>
                  + Kasih
                </button>
              </div>
              <div className="ad-form">
                Level
                <input type="number" min={1} max={100} placeholder={`Lv.${lv}`} value={lvlIn[u.uid] || ''} onChange={(e) => setLvlIn((p) => ({ ...p, [u.uid]: e.target.value }))} />
                <button type="button" onClick={() => setLevel(u.uid)}>
                  Set Level
                </button>
              </div>
              <div className="ad-form">
                Rank
                <select value={rankIn[u.uid] || u.roleOverride || ROLE_TIERS[0].name} onChange={(e) => setRankIn((p) => ({ ...p, [u.uid]: e.target.value }))}>
                  {ROLE_TIERS.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => setRank(u.uid)}>
                  Set Rank
                </button>
              </div>
              <Link href={`/u?uid=${u.uid}`} className="ad-form" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                Lihat profil →
              </Link>
            </div>
          </div>
        );
      })}

      {filtered.length > limit && (
        <button type="button" className="pill-btn block" style={{ marginTop: 16 }} onClick={() => setLimit((l) => l + 30)}>
          Tampilkan lebih banyak ({filtered.length - limit})
        </button>
      )}

      {note ? <div className="pf-toast">{note}</div> : null}
    </>
  );
}
