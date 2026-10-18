'use client';

import '../app/comments.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Heart, MessageCircle, Send, Trash2, X } from 'lucide-react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { fbApp } from '@/lib/firebase';
import { roleFor, timeAgo } from '@/lib/roles';
import { useAuth } from './AuthProvider';
import { useExtras } from './Extras';
import { usePlayer } from './Providers';
import { useProgress2 } from './ProgressProvider';

type CommentDoc = {
  id: string;
  uid: string;
  user: string;
  photoURL?: string | null;
  text: string;
  likes?: number;
  replyCount?: number;
  level?: number;
  role?: string | null;
  ms: number;
};

type ReplyDoc = { id: string; uid: string; user: string; photoURL?: string | null; text: string; ms: number };

const LIKES_KEY = 'hm_clikes';

function Av({ name, photo, small }: { name: string; photo?: string | null; small?: boolean }) {
  return (
    <div className={`cm-av${small ? ' sm' : ''}`}>
      {photo ? <img src={photo} alt="" referrerPolicy="no-referrer" /> : (name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export default function CommentsSheet() {
  const { commentsOpen, closeComments, closeFull } = useExtras();
  const { current } = usePlayer();
  const { user, handle, photo, displayName } = useAuth();
  const { level } = useProgress2();

  const [items, setItems] = useState<CommentDoc[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'error' | 'denied'>('loading');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [replies, setReplies] = useState<Record<string, ReplyDoc[]>>({});
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [toast, setToast] = useState('');

  const tid = current ? current.id.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
  const myName = user ? displayName || handle || 'User' : '';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LIKES_KEY);
      if (raw) setLikes(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    setOpen({});
    setReplies({});
    setReplyFor(null);
    setReplyText('');
  }, [tid]);

  useEffect(() => {
    if (!commentsOpen || !tid) return;
    setState('loading');
    const db = getFirestore(fbApp());
    const q = query(collection(db, 'track_comments', tid, 'comments'), orderBy('ts', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((d) => {
            const c = d.data({ serverTimestamps: 'estimate' });
            return {
              id: d.id,
              uid: c.uid,
              user: c.user || 'User',
              photoURL: c.photoURL || null,
              text: c.text || '',
              likes: c.likes || 0,
              replyCount: c.replyCount || 0,
              level: c.level,
              role: c.role || null,
              ms: c.ts?.toMillis ? c.ts.toMillis() : Date.now()
            };
          })
        );
        setState('ok');
      },
      (err) => setState(err.code === 'permission-denied' ? 'denied' : 'error')
    );
    return () => unsub();
  }, [commentsOpen, tid]);

  const flash = (m: string) => setToast(m);

  const send = async () => {
    const t = text.trim();
    if (!t || !user || sending || !tid) return;
    setSending(true);
    try {
      const db = getFirestore(fbApp());
      let role: string | null = null;
      let banner: string | null = null;
      try {
        const ps = await getDoc(doc(db, 'user_profiles', user.uid));
        if (ps.exists()) {
          const d = ps.data();
          role = d.roleOverride || roleFor(d.commentCount || 0);
          banner = d.bannerThemeId || null;
        }
      } catch {}
      await addDoc(collection(db, 'track_comments', tid, 'comments'), {
        uid: user.uid,
        user: myName,
        photoURL: photo || null,
        text: t,
        likes: 0,
        replyCount: 0,
        level: level.level,
        role,
        bannerThemeId: banner,
        ts: serverTimestamp()
      });
      setDoc(doc(db, 'user_profiles', user.uid), { commentCount: increment(1) }, { merge: true }).catch(() => {});
      setText('');
    } catch {
      flash('Gagal kirim komentar');
    }
    setSending(false);
  };

  const remove = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(getFirestore(fbApp()), 'track_comments', tid, 'comments', id));
    } catch {
      flash('Gagal hapus komentar');
    }
  };

  const toggleLike = (id: string) => {
    if (!user) {
      flash('Masuk dulu untuk menyukai');
      return;
    }
    setLikes((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(LIKES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const loadReplies = async (id: string) => {
    try {
      const db = getFirestore(fbApp());
      const snap = await getDocs(query(collection(db, 'track_comments', tid, 'comments', id, 'replies'), orderBy('ts', 'asc')));
      setReplies((prev) => ({
        ...prev,
        [id]: snap.docs.map((d) => {
          const r = d.data({ serverTimestamps: 'estimate' });
          return {
            id: d.id,
            uid: r.uid,
            user: r.user || 'User',
            photoURL: r.photoURL || null,
            text: r.text || '',
            ms: r.ts?.toMillis ? r.ts.toMillis() : Date.now()
          };
        })
      }));
    } catch {
      flash('Gagal memuat balasan');
    }
  };

  const toggleReplies = (id: string) => {
    const next = !open[id];
    setOpen((p) => ({ ...p, [id]: next }));
    if (next && !replies[id]) loadReplies(id);
  };

  const sendReply = async (id: string) => {
    const t = replyText.trim();
    if (!t || !user) return;
    try {
      const db = getFirestore(fbApp());
      await addDoc(collection(db, 'track_comments', tid, 'comments', id, 'replies'), {
        uid: user.uid,
        user: myName,
        photoURL: photo || null,
        text: t,
        ts: serverTimestamp()
      });
      await updateDoc(doc(db, 'track_comments', tid, 'comments', id), { replyCount: increment(1) });
      setDoc(doc(db, 'user_profiles', user.uid), { commentCount: increment(1) }, { merge: true }).catch(() => {});
      setReplyText('');
      setReplyFor(null);
      setOpen((p) => ({ ...p, [id]: true }));
      loadReplies(id);
    } catch {
      flash('Gagal kirim balasan');
    }
  };

  const removeReply = async (cid: string, rid: string) => {
    try {
      const db = getFirestore(fbApp());
      await deleteDoc(doc(db, 'track_comments', tid, 'comments', cid, 'replies', rid));
      await updateDoc(doc(db, 'track_comments', tid, 'comments', cid), { replyCount: increment(-1) });
      setReplies((p) => ({ ...p, [cid]: (p[cid] || []).filter((x) => x.id !== rid) }));
    } catch {
      flash('Gagal hapus balasan');
    }
  };

  const show = commentsOpen && !!current;

  return (
    <>
      <div className={`cm-backdrop${show ? ' open' : ''}`} onClick={closeComments} />
      <section className={`cm-sheet${show ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Komentar" aria-hidden={!show}>
        <div className="cm-head">
          <b>Komentar</b>
          <span className="cm-count">{state === 'ok' ? items.length : ''}</span>
          <button type="button" className="cm-x" onClick={closeComments} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        {show && (
          <div className="cm-list">
            {state === 'loading' && <div className="cm-empty">Memuat komentar...</div>}
            {state === 'denied' && <div className="cm-empty">Komentar belum bisa diakses. Cek aturan Firestore di Firebase.</div>}
            {state === 'error' && <div className="cm-empty">Gagal memuat komentar. Coba lagi nanti.</div>}
            {state === 'ok' && items.length === 0 && <div className="cm-empty">💬 Belum ada komentar. Jadilah yang pertama!</div>}

            {state === 'ok' &&
              items.map((c) => {
                const own = !!user && c.uid === user.uid;
                const liked = !!likes[c.id];
                const n = (c.likes || 0) + (liked ? 1 : 0);
                const rc = c.replyCount || 0;
                return (
                  <div key={c.id} className="cm-item">
                    <Link href={`/u?uid=${c.uid}`} onClick={() => { closeComments(); closeFull(); }}>
                      <Av name={c.user} photo={c.photoURL} />
                    </Link>
                    <div className="cm-body">
                      <div className="cm-meta">
                        <Link href={`/u?uid=${c.uid}`} className="cm-name" onClick={() => { closeComments(); closeFull(); }}>
                          {c.user}
                        </Link>
                        {c.role ? <span className="cm-badge">{c.role}</span> : null}
                        {c.level ? <span className="cm-badge">Lv.{c.level}</span> : null}
                        <span>{timeAgo(c.ms)}</span>
                      </div>
                      <div className="cm-text">{c.text}</div>
                      <div className="cm-acts">
                        <button type="button" className={`cm-act${liked ? ' on' : ''}`} onClick={() => toggleLike(c.id)}>
                          <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
                          {n > 0 ? n : ''}
                        </button>
                        <button
                          type="button"
                          className="cm-act"
                          onClick={() => {
                            if (!user) return flash('Masuk dulu untuk membalas');
                            setReplyFor(replyFor === c.id ? null : c.id);
                            setReplyText('');
                          }}
                        >
                          <MessageCircle size={15} />
                          Balas
                        </button>
                        {own && (
                          <button type="button" className="cm-act" onClick={() => remove(c.id)} aria-label="Hapus">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {replyFor === c.id && (
                        <div className="cm-rbox">
                          <input
                            autoFocus
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Tulis balasan..."
                            onKeyDown={(e) => e.key === 'Enter' && sendReply(c.id)}
                          />
                          <button type="button" className="cm-send" onClick={() => sendReply(c.id)} aria-label="Kirim balasan">
                            <Send size={16} />
                          </button>
                        </div>
                      )}

                      {rc > 0 && (
                        <button type="button" className="cm-act on" onClick={() => toggleReplies(c.id)}>
                          <ChevronDown size={15} style={{ transform: open[c.id] ? 'rotate(180deg)' : undefined }} />
                          {rc} balasan
                        </button>
                      )}

                      {open[c.id] && (
                        <div className="cm-replies">
                          {!replies[c.id] && <div className="cm-meta">Memuat balasan...</div>}
                          {(replies[c.id] || []).map((r) => (
                            <div key={r.id} className="cm-item" style={{ padding: '8px 0' }}>
                              <Av name={r.user} photo={r.photoURL} small />
                              <div className="cm-body">
                                <div className="cm-meta">
                                  <span className="cm-name">{r.user}</span>
                                  <span>{timeAgo(r.ms)}</span>
                                </div>
                                <div className="cm-text">{r.text}</div>
                                {user && r.uid === user.uid && (
                                  <button type="button" className="cm-act" onClick={() => removeReply(c.id, r.id)} aria-label="Hapus balasan">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        <div className="cm-input">
          {user ? (
            <>
              <Av name={myName} photo={photo} small />
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tulis komentar..."
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
              <button type="button" className="cm-send" onClick={send} disabled={sending || !text.trim()} aria-label="Kirim">
                <Send size={16} />
              </button>
            </>
          ) : (
            <Link href="/login" className="cm-login" onClick={closeComments}>
              Masuk untuk berkomentar
            </Link>
          )}
        </div>
        {toast ? <div className="cm-toast">{toast}</div> : null}
      </section>
    </>
  );
}
