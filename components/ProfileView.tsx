'use client';

import '../app/profile.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ListMusic, LogOut, Pencil, Plus, Share2, X } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref as sref, uploadBytes } from 'firebase/storage';
import { fbApp } from '@/lib/firebase';
import { resizeImage, type FavSong, type Profile, type ShownPl } from '@/lib/profile';
import { roleFor, timeAgo } from '@/lib/roles';
import { computeLevelInfo } from '@/lib/level';
import { useAuth } from './AuthProvider';
import { useExtras } from './Extras';
import { usePlayer } from './Providers';
import TrackRow from './TrackRow';
import TrackThumb from './TrackThumb';
import { useI18n } from '@/components/I18nProvider';

type Sheet = 'none' | 'edit' | 'fav' | 'pl';
type Act = { id: string; text: string; ms: number };

export default function ProfileView({ uid }: { uid: string }) {
  const { t: tr } = useI18n();
  const router = useRouter();
  const { user, logout, refreshProfile } = useAuth();
  const { liked } = usePlayer();
  const { playlists } = useExtras();
  const own = !!user && user.uid === uid;

  const [data, setData] = useState<Profile | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'none' | 'error'>('loading');
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [acts, setActs] = useState<Act[] | null>(null);
  const [sheet, setSheet] = useState<Sheet>('none');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [pickFav, setPickFav] = useState<string[]>([]);
  const [pickPl, setPickPl] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const avRef = useRef<HTMLInputElement | null>(null);
  const galRef = useRef<HTMLInputElement | null>(null);
  const bnRef = useRef<HTMLInputElement | null>(null);

  const db = () => getFirestore(fbApp());
  const flash = (m: string) => setToast(m);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const reload = useCallback(async () => {
    try {
      const snap = await getDoc(doc(getFirestore(fbApp()), 'user_profiles', uid));
      if (!snap.exists()) {
        setState('none');
        return;
      }
      setData(snap.data() as Profile);
      setState('ok');
    } catch {
      setState('error');
    }
  }, [uid]);

  useEffect(() => {
    setState('loading');
    reload();
  }, [reload]);

  useEffect(() => {
    let off = false;
    const d = getFirestore(fbApp());
    getCountFromServer(collection(d, 'user_profiles', uid, 'followers'))
      .then((s) => !off && setFollowers(s.data().count))
      .catch(() => {});
    getCountFromServer(collection(d, 'user_profiles', uid, 'following'))
      .then((s) => !off && setFollowing(s.data().count))
      .catch(() => {});
    if (user && !own) {
      getDoc(doc(d, 'user_profiles', uid, 'followers', user.uid))
        .then((s) => !off && setIsFollowing(s.exists()))
        .catch(() => {});
    }
    return () => {
      off = true;
    };
  }, [uid, user, own]);

  useEffect(() => {
    let off = false;
    setActs(null);
    const q = query(collectionGroup(getFirestore(fbApp()), 'comments'), where('uid', '==', uid), orderBy('ts', 'desc'), limit(10));
    getDocs(q)
      .then((snap) => {
        if (off) return;
        setActs(
          snap.docs.map((d) => {
            const c = d.data({ serverTimestamps: 'estimate' });
            return { id: d.id, text: c.text || '', ms: c.ts?.toMillis ? c.ts.toMillis() : Date.now() };
          })
        );
      })
      .catch(() => !off && setActs([]));
    return () => {
      off = true;
    };
  }, [uid]);

  const toggleFollow = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    const a = doc(db(), 'user_profiles', uid, 'followers', user.uid);
    const b = doc(db(), 'user_profiles', user.uid, 'following', uid);
    try {
      if (isFollowing) {
        await deleteDoc(a);
        await deleteDoc(b);
        setIsFollowing(false);
        setFollowers((n) => Math.max(0, n - 1));
      } else {
        await setDoc(a, { at: serverTimestamp() });
        await setDoc(b, { at: serverTimestamp() });
        setIsFollowing(true);
        setFollowers((n) => n + 1);
      }
    } catch {
      flash(tr("Follow belum diizinkan oleh aturan Firestore"));
    }
  };

  const openEdit = () => {
    setName(data?.displayName || user?.displayName || '');
    setBio(data?.bio || '');
    setSheet('edit');
  };

  const saveEdit = async () => {
    if (!user || !name.trim()) return flash(tr("Nama tidak boleh kosong"));
    setBusy(true);
    try {
      await setDoc(doc(db(), 'user_profiles', user.uid), { displayName: name.trim(), bio: bio.trim() }, { merge: true });
      try {
        await updateProfile(user, { displayName: name.trim() });
      } catch {}
      await refreshProfile();
      await reload();
      setSheet('none');
      flash(tr("Profil disimpan"));
    } catch {
      flash(tr("Gagal menyimpan profil"));
    }
    setBusy(false);
  };

  const onAvatar = async (f: File | undefined) => {
    if (!f || !user) return;
    try {
      flash(tr("Mengunggah avatar..."));
      const url = await resizeImage(f, 160, 0.7, true);
      await setDoc(doc(db(), 'user_profiles', user.uid), { photoURL: url }, { merge: true });
      await refreshProfile();
      await reload();
      flash(tr("Avatar diperbarui"));
    } catch (e) {
      flash(e instanceof Error ? e.message : tr('Gagal ganti avatar'));
    }
  };

  const onBanner = async (f: File | undefined) => {
    if (!f || !user) return;
    const isVideo = f.type.startsWith('video/');
    if (!isVideo && !f.type.startsWith('image/')) return flash(tr('File harus gambar atau video'));
    if (isVideo && f.size > 25 * 1024 * 1024) return flash(tr('Video maksimal 25 MB'));
    setBusy(true);
    flash(tr('Mengunggah latar...'));
    try {
      let blob: Blob = f;
      let dataUrl = '';
      if (!isVideo) {
        dataUrl = await resizeImage(f, 1000, 0.75);
        blob = await (await fetch(dataUrl)).blob();
      }
      const ext = isVideo ? (f.name.split('.').pop() || 'mp4').toLowerCase() : 'jpg';
      const path = `banners/${user.uid}/banner-${Date.now()}.${ext}`;
      let url = '';
      try {
        const r = sref(getStorage(fbApp()), path);
        await uploadBytes(r, blob, { contentType: isVideo ? f.type || 'video/mp4' : 'image/jpeg' });
        url = await getDownloadURL(r);
      } catch (e) {
        if (isVideo) throw e;
        url = dataUrl;
      }
      await setDoc(doc(db(), 'user_profiles', user.uid), { bannerURL: url, bannerType: isVideo ? 'video' : 'image' }, { merge: true });
      await reload();
      flash(tr('Latar profil diperbarui'));
    } catch {
      flash(tr('Gagal mengunggah latar. Pastikan Firebase Storage aktif.'));
    }
    setBusy(false);
  };

  const removeBanner = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db(), 'user_profiles', user.uid), { bannerURL: '', bannerType: '' }, { merge: true });
      await reload();
      flash(tr('Latar profil dihapus'));
    } catch {
      flash(tr('Gagal menyimpan'));
    }
  };

  const onGallery = async (f: File | undefined) => {
    if (!f || !user) return;
    if ((data?.gallery?.length || 0) >= 6) return flash(tr("Galeri maksimal 6 foto"));
    try {
      flash(tr("Mengunggah foto..."));
      const url = await resizeImage(f, 480, 0.7);
      await setDoc(doc(db(), 'user_profiles', user.uid), { gallery: arrayUnion(url) }, { merge: true });
      await reload();
      flash(tr("Foto ditambahkan"));
    } catch (e) {
      flash(e instanceof Error ? e.message : tr('Gagal menambah foto'));
    }
  };

  const removeGallery = async (url: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db(), 'user_profiles', user.uid), { gallery: arrayRemove(url) }, { merge: true });
      await reload();
    } catch {
      flash(tr("Gagal menghapus foto"));
    }
  };

  const openFav = () => {
    setPickFav((data?.favSongs || []).map((s) => s.id));
    setSheet('fav');
  };

  const openPl = () => {
    setPickPl((data?.shownPlaylists || []).map((p) => p.name));
    setSheet('pl');
  };

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) => {
    if (arr.includes(v)) set(arr.filter((x) => x !== v));
    else if (arr.length >= 5) flash(tr("Maksimal 5"));
    else set([...arr, v]);
  };

  const saveFav = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const favSongs: FavSong[] = liked
        .filter((t) => pickFav.includes(t.id))
        .map((t) => ({ id: t.id, title: t.title, artist: t.artist, thumb: t.thumb || '' }));
      await setDoc(doc(db(), 'user_profiles', user.uid), { favSongs }, { merge: true });
      await reload();
      setSheet('none');
    } catch {
      flash(tr("Gagal menyimpan"));
    }
    setBusy(false);
  };

  const savePl = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const shownPlaylists: ShownPl[] = playlists
        .filter((p) => pickPl.includes(p.name))
        .map((p) => ({ name: p.name, count: p.tracks.length, thumb: p.tracks[0]?.thumb || '' }));
      await setDoc(doc(db(), 'user_profiles', user.uid), { shownPlaylists }, { merge: true });
      await reload();
      setSheet('none');
    } catch {
      flash(tr("Gagal menyimpan"));
    }
    setBusy(false);
  };

  const share = async () => {
    const url = typeof window === 'undefined' ? '' : `${window.location.origin}/u?uid=${uid}`;
    try {
      if (navigator.share) await navigator.share({ title: data?.displayName || tr('Profil'), url });
      else {
        await navigator.clipboard.writeText(url);
        flash(tr("Link profil disalin"));
      }
    } catch {}
  };

  if (state === 'loading') return <p className="greeting-sub">{tr("Memuat profil...")}</p>;
  if (state === 'none') return <p className="greeting-sub">{tr("Pengguna tidak ditemukan.")}</p>;
  if (state === 'error' || !data) return <p className="greeting-sub">{tr("Profil belum bisa dimuat. Cek aturan Firestore atau koneksi.")}</p>;

  const nm = data.displayName || 'User';
  const cc = data.commentCount || 0;
  const favSongs = data.favSongs || [];
  const shown = data.shownPlaylists || [];
  const gallery = data.gallery || [];

  return (
    <>
      <div className="profile-hero">
        {data.bannerURL ? (
          data.bannerType === 'video' ? (
            <video src={data.bannerURL} autoPlay muted loop playsInline />
          ) : (
            <img src={data.bannerURL} alt="" />
          )
        ) : null}
      </div>
      <div className="profile-actions">
        <button type="button" className="round-btn" aria-label={tr("Bagikan")} onClick={share}>
          <Share2 size={21} />
        </button>
        {own && (
          <button type="button" className="round-btn" aria-label={tr("Keluar")} onClick={() => logout().then(() => router.push('/'))}>
            <LogOut size={21} />
          </button>
        )}
      </div>

      <section className="profile-main">
        <div className="avatar profile-avatar" style={{ position: 'relative' }}>
          {data.photoURL ? <img src={data.photoURL} alt="" referrerPolicy="no-referrer" /> : nm.charAt(0).toUpperCase()}
        </div>

        {own ? (
          <button type="button" className="pill-btn profile-edit" style={{ height: 44, padding: '0 20px', fontSize: 15 }} onClick={openEdit}>
            <Pencil size={17} />
            {tr("Edit profil")}
          </button>
        ) : (
          <button type="button" className={`pf-follow${isFollowing ? ' on' : ''}`} onClick={toggleFollow}>
            {isFollowing ? 'Mengikuti' : tr('Ikuti')}
          </button>
        )}

        <h1 className="profile-name">{nm}</h1>
        <div className="pf-badges">
          <span className="pf-badge">Lv.{computeLevelInfo(data.levelPoints || 0).level}</span>
          <span className="pf-badge">{tr(data.roleOverride || roleFor(cc))}</span>
        </div>
        <p className="profile-bio">{data.bio?.trim() ? data.bio : own ? 'Belum ada bio. Ketuk Edit profil untuk menambahkannya.' : tr('Belum ada bio.')}</p>

        <div className="pf-stats">
          <div className="pf-stat">
            <b>{followers}</b>
            <span>{tr("Pengikut")}</span>
          </div>
          <div className="pf-stat">
            <b>{following}</b>
            <span>{tr("Mengikuti")}</span>
          </div>
          <div className="pf-stat">
            <b>{cc}</b>
            <span>{tr("Komentar")}</span>
          </div>
        </div>

        <div className="block-head">
          <h3>{tr("Lagu favorit")}</h3>
          {own && (
            <button type="button" className="mini-pill" onClick={openFav}>
              {tr("Atur")}
            </button>
          )}
        </div>
        {favSongs.length === 0 ? (
          <div className="dashed">{own ? 'Belum ada lagu favorit. Ketuk Atur untuk memilih dari Lagu Disukai.' : tr('Belum ada lagu favorit.')}</div>
        ) : (
          <div className="track-list">
            {favSongs.map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} queue={favSongs} />
            ))}
          </div>
        )}

        <div className="block-head">
          <h3>{tr("Playlist")}</h3>
          {own && (
            <button type="button" className="mini-pill" onClick={openPl}>
              {tr("Atur")}
            </button>
          )}
        </div>
        {shown.length === 0 ? (
          <div className="dashed">{own ? 'Belum ada playlist yang ditampilkan. Ketuk Atur untuk memilih dari Library-mu.' : tr('Belum ada playlist yang ditampilkan.')}</div>
        ) : (
          shown.map((p) => (
            <div key={p.name} className="pf-pick" style={{ cursor: 'default' }}>
              {p.thumb ? (
                <TrackThumb track={{ id: p.name, title: p.name, artist: '', thumb: p.thumb }} className="thumb" />
              ) : (
                <span className="thumb" style={{ background: 'var(--surface2)' }}>
                  <ListMusic size={20} />
                </span>
              )}
              <span className="row-body">
                <span className="row-title" style={{ display: 'block', fontSize: 15 }}>
                  {p.name}
                </span>
                <span className="row-sub" style={{ display: 'block', fontSize: 12 }}>
                  {tr('{n} lagu', { n: p.count })}
                </span>
              </span>
            </div>
          ))
        )}

        <div className="block-head">
          <h3>{tr("Galeri")}</h3>
        </div>
        <div className="pf-gal">
          {gallery.map((g, i) => (
            <div key={i} className="pf-gal-item">
              <img src={g} alt="" />
              {own && (
                <button type="button" className="pf-gal-x" onClick={() => removeGallery(g)} aria-label={tr("Hapus foto")}>
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {own && gallery.length < 6 && (
            <button type="button" className="pf-gal-add" onClick={() => galRef.current?.click()} aria-label={tr("Tambah foto")}>
              <Plus size={26} />
            </button>
          )}
        </div>
        {!own && gallery.length === 0 && <div className="dashed">{tr("Belum ada foto.")}</div>}

        <div className="block-head">
          <h3>{tr("Aktivitas")}</h3>
        </div>
        {acts === null && <div className="dashed">{tr("Memuat aktivitas...")}</div>}
        {acts && acts.length === 0 && <div className="dashed">{tr("💬 Belum ada aktivitas.")}</div>}
        {acts?.map((a) => (
          <div key={a.id} className="pf-act">
            <span>💬</span>
            <div>
              {a.text}
              <small>{timeAgo(a.ms)}</small>
            </div>
          </div>
        ))}
      </section>

      <input ref={avRef} type="file" accept="image/*" hidden onChange={(e) => { onAvatar(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={bnRef} type="file" accept="image/*,video/*" hidden onChange={(e) => { onBanner(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={galRef} type="file" accept="image/*" hidden onChange={(e) => { onGallery(e.target.files?.[0]); e.target.value = ''; }} />

      <div className={`sheet-backdrop${sheet !== 'none' ? ' open' : ''}`} onClick={() => setSheet('none')} />
      <section className={`sheet glass${sheet !== 'none' ? ' open' : ''}`} role="dialog" aria-modal="true" aria-hidden={sheet === 'none'}>
        <div className="sheet-grip" />
        {sheet === 'edit' && (
          <>
            <h3>{tr("Edit profil")}</h3>
            <label className="pf-field">
              <span>{tr("Nama")}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            </label>
            <label className="pf-field">
              <span>{tr("Bio")}</span>
              <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} />
            </label>
            <button type="button" className="pf-sheet-btn ghost" onClick={() => bnRef.current?.click()} disabled={busy}>
              {tr('Ganti latar profil (foto/video)')}
            </button>
            {data.bannerURL ? (
              <button type="button" className="pf-sheet-btn ghost" onClick={removeBanner}>
                {tr('Hapus latar profil')}
              </button>
            ) : null}
            <button type="button" className="pf-sheet-btn ghost" onClick={() => avRef.current?.click()}>
              {tr("Ganti foto profil")}
            </button>
            <button type="button" className="pf-sheet-btn" onClick={saveEdit} disabled={busy}>
              {busy ? 'Menyimpan...' : tr('Simpan')}
            </button>
          </>
        )}
        {sheet === 'fav' && (
          <>
            <h3>{tr("Lagu favorit")}</h3>
            <p>{tr("Pilih sampai 5 dari Lagu Disukai.")}</p>
            <div className="pf-list">
              {liked.length === 0 && <p style={{ margin: 0, fontSize: 14 }}>{tr("Belum ada lagu disukai.")}</p>}
              {liked.map((t) => (
                <button key={t.id} type="button" className={`pf-pick${pickFav.includes(t.id) ? ' on' : ''}`} onClick={() => toggle(pickFav, t.id, setPickFav)}>
                  <TrackThumb track={t} className="thumb" />
                  <span className="row-body">
                    <span className="row-title" style={{ display: 'block', fontSize: 15 }}>
                      {t.title}
                    </span>
                    <span className="row-sub" style={{ display: 'block', fontSize: 12 }}>
                      {t.artist}
                    </span>
                  </span>
                  {pickFav.includes(t.id) && <Check size={18} color="var(--accent)" />}
                </button>
              ))}
            </div>
            <button type="button" className="pf-sheet-btn" onClick={saveFav} disabled={busy}>
              {busy ? 'Menyimpan...' : tr('Simpan')}
            </button>
          </>
        )}
        {sheet === 'pl' && (
          <>
            <h3>{tr("Playlist")}</h3>
            <p>{tr("Pilih sampai 5 playlist untuk ditampilkan.")}</p>
            <div className="pf-list">
              {playlists.length === 0 && <p style={{ margin: 0, fontSize: 14 }}>{tr("Belum ada playlist di Library.")}</p>}
              {playlists.map((p) => (
                <button key={p.id} type="button" className={`pf-pick${pickPl.includes(p.name) ? ' on' : ''}`} onClick={() => toggle(pickPl, p.name, setPickPl)}>
                  {p.tracks[0] ? (
                    <TrackThumb track={p.tracks[0]} className="thumb" />
                  ) : (
                    <span className="thumb" style={{ background: 'var(--surface2)' }}>
                      <ListMusic size={20} />
                    </span>
                  )}
                  <span className="row-body">
                    <span className="row-title" style={{ display: 'block', fontSize: 15 }}>
                      {p.name}
                    </span>
                    <span className="row-sub" style={{ display: 'block', fontSize: 12 }}>
                      {tr('{n} lagu', { n: p.tracks.length })}
                    </span>
                  </span>
                  {pickPl.includes(p.name) && <Check size={18} color="var(--accent)" />}
                </button>
              ))}
            </div>
            <button type="button" className="pf-sheet-btn" onClick={savePl} disabled={busy}>
              {busy ? 'Menyimpan...' : tr('Simpan')}
            </button>
          </>
        )}
      </section>

      {toast ? <div className="pf-toast">{toast}</div> : null}
    </>
  );
}
