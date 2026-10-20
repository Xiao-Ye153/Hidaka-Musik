'use client';

import '../chat.css';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { useProgress2 } from '@/components/ProgressProvider';
import { fbApp } from '@/lib/firebase';
import { getCurrentLang } from '@/lib/i18n';
import { roleFor } from '@/lib/roles';
import { useI18n } from '@/components/I18nProvider';

type Msg = {
  id: string;
  uid: string;
  user: string;
  photoURL: string | null;
  text: string;
  level?: number;
  ms: number;
};

function clock(ms: number) {
  const l = getCurrentLang();
  return new Date(ms).toLocaleTimeString(l === 'ru' ? 'ru-RU' : l === 'en' ? 'en-US' : 'id-ID', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage() {
  const { t: tr } = useI18n();
  const router = useRouter();
  const { user, photo, displayName, handle, profile } = useAuth();
  const { level } = useProgress2();

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'denied' | 'error'>('loading');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastSend = useRef(0);
  const stick = useRef(true);

  useEffect(() => {
    const q = query(collection(getFirestore(fbApp()), 'global_chat'), orderBy('ts', 'desc'), limit(60));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const c = d.data({ serverTimestamps: 'estimate' });
            return {
              id: d.id,
              uid: c.uid,
              user: c.user || 'User',
              photoURL: c.photoURL || null,
              text: c.text || '',
              level: c.level,
              ms: c.ts?.toMillis ? c.ts.toMillis() : Date.now()
            } as Msg;
          })
          .reverse();
        setMsgs(list);
        setState('ok');
      },
      (err) => setState(err.code === 'permission-denied' ? 'denied' : 'error')
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(''), 2400);
    return () => clearTimeout(id);
  }, [note]);

  const onScroll = () => {
    const el = listRef.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const send = async () => {
    const t = text.trim();
    if (!t || !user || sending) return;
    if (Date.now() - lastSend.current < 1500) {
      setNote(tr("Pelan-pelan, tunggu sebentar"));
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(getFirestore(fbApp()), 'global_chat'), {
        uid: user.uid,
        user: displayName || handle || 'User',
        photoURL: photo || null,
        text: t.slice(0, 300),
        level: level.level,
        role: roleFor(profile?.commentCount || 0),
        ts: serverTimestamp()
      });
      lastSend.current = Date.now();
      stick.current = true;
      setText('');
    } catch {
      setNote(tr("Gagal mengirim pesan"));
    }
    setSending(false);
  };

  const remove = async (id: string) => {
    try {
      await deleteDoc(doc(getFirestore(fbApp()), 'global_chat', id));
    } catch {
      setNote(tr("Gagal menghapus pesan"));
    }
  };

  return (
    <div className="ch-root">
      <div className="ch-head">
        <button type="button" className="ch-back" onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))} aria-label={tr("Kembali")}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="ch-title">{tr("Chat Global")}</div>
          <div className="ch-sub">{tr("Ngobrol bareng pendengar lain")}</div>
        </div>
      </div>

      <div className="ch-list" ref={listRef} onScroll={onScroll}>
        {state === 'loading' && <div className="ch-note">{tr("Memuat chat...")}</div>}
        {state === 'denied' && <div className="ch-note">Chat belum bisa diakses. Cek aturan Firestore untuk koleksi global_chat.</div>}
        {state === 'error' && <div className="ch-note">{tr("Gagal memuat chat. Coba lagi nanti.")}</div>}
        {state === 'ok' && msgs.length === 0 && <div className="ch-note">{tr("💬 Belum ada pesan. Mulai obrolan pertama!")}</div>}

        {msgs.map((m) => {
          const own = !!user && m.uid === user.uid;
          return (
            <div key={m.id} className={`ch-msg${own ? ' own' : ''}`}>
              <Link href={`/u?uid=${m.uid}`} className="ch-av" aria-label={m.user}>
                {m.photoURL ? <img src={m.photoURL} alt="" referrerPolicy="no-referrer" /> : m.user.charAt(0).toUpperCase()}
              </Link>
              <div className="ch-bubble">
                <div className="ch-meta">
                  <span className="ch-name">{m.user}</span>
                  {m.level ? <span className="ch-lv">Lv.{m.level}</span> : null}
                  <span>{clock(m.ms)}</span>
                  {own && (
                    <button type="button" className="ch-del" onClick={() => remove(m.id)}>
                      {tr("Hapus")}
                    </button>
                  )}
                </div>
                <div className="ch-text">{m.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ch-input">
        {user ? (
          <>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={tr("Tulis pesan...")}
              maxLength={300}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button type="button" className="ch-send" onClick={send} disabled={sending || !text.trim()} aria-label={tr("Kirim")}>
              <Send size={18} />
            </button>
          </>
        ) : (
          <Link href="/login" className="ch-login">
            {tr("Masuk untuk ikut ngobrol")}
          </Link>
        )}
      </div>
      {note ? <div className="ms-toast">{note}</div> : null}
    </div>
  );
}
