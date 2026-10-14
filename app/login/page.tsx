'use client';

import './login.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { APP } from '@/lib/config';

type Mode = 'login' | 'register';
type View = 'main' | 'phone';

function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, loginGoogle, loginEmail, registerEmail, resetPassword, sendPhoneCode, confirmPhoneCode } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [view, setView] = useState<View>('main');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace('/');
  }, [ready, user, router]);

  const run = async (fn: () => Promise<string | null>, after?: () => void) => {
    setBusy(true);
    setMsg('');
    setOk(false);
    const e = await fn();
    setBusy(false);
    if (e) setMsg(e);
    else after?.();
  };

  const submit = () => {
    if (mode === 'register' && !name.trim()) return setMsg('Isi nama lengkap dulu.');
    if (!email.trim() || !pass) return setMsg('Isi email dan password.');
    if (pass.length < 6) return setMsg('Password minimal 6 karakter.');
    run(() => (mode === 'register' ? registerEmail(name, email, pass) : loginEmail(email, pass)));
  };

  const forgot = () => {
    if (!email.trim()) return setMsg('Isi email dulu, lalu ketuk Lupa password.');
    run(() => resetPassword(email), () => {
      setOk(true);
      setMsg('Link reset password sudah dikirim ke email kamu.');
    });
  };

  const submitPhone = () => {
    if (!codeSent) {
      if (phone.replace(/\D/g, '').length < 8) return setMsg('Isi nomor HP yang valid.');
      run(() => sendPhoneCode(phone), () => setCodeSent(true));
    } else {
      if (code.trim().length < 6) return setMsg('Masukkan 6 digit kode.');
      run(() => confirmPhoneCode(code));
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setMsg('');
  };

  return (
    <div className="lg-root">
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <button type="button" className="lg-back" onClick={() => (view === 'phone' ? setView('main') : router.push('/'))} aria-label="Kembali">
        <ArrowLeft size={20} />
      </button>

      <div className="lg-top">
        <span className="lg-dot o" />
        <span className="lg-dot w" />
        <span className="lg-dot b" />
        <div className="lg-emblem">
          <span className="lg-ring a" />
          <span className="lg-ring b" />
          <div className="lg-logo">
            {APP.nameTop.charAt(0)}
            <img src="/icon-192.png" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
        </div>
        <div className="lg-brand">{APP.name}</div>
      </div>

      <div className="lg-sheet">
        <div className="lg-grip" />

        {view === 'main' ? (
          <>
            <div className="lg-tabs">
              <button type="button" className={`lg-tab${mode === 'login' ? ' on' : ''}`} onClick={() => switchMode('login')}>
                MASUK
              </button>
              <button type="button" className={`lg-tab${mode === 'register' ? ' on' : ''}`} onClick={() => switchMode('register')}>
                DAFTAR
              </button>
            </div>

            {mode === 'register' && (
              <input className="lg-in" placeholder="Nama Lengkap" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            )}
            <input className="lg-in" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <input
              className="lg-in"
              type="password"
              placeholder="Password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />

            {mode === 'login' && (
              <button type="button" className="lg-forgot" onClick={forgot}>
                Lupa password?
              </button>
            )}

            {msg ? <div className={`lg-msg${ok ? ' ok' : ''}`}>{msg}</div> : null}

            <button type="button" className="lg-btn blue" onClick={submit} disabled={busy}>
              {busy ? 'Memproses...' : mode === 'register' ? 'Daftar Sekarang' : 'Masuk'}
            </button>

            <div className="lg-or">ATAU</div>

            <button type="button" className="lg-btn white" onClick={() => run(loginGoogle)} disabled={busy}>
              <GoogleG />
              Lanjutkan dengan Google
            </button>
            <button
              type="button"
              className="lg-btn mint"
              onClick={() => {
                setView('phone');
                setMsg('');
              }}
            >
              <Phone size={18} />
              Lanjutkan dengan Nomor HP
            </button>

            <p className="lg-switch">
              {mode === 'register' ? 'Udah punya akun?' : 'Belum punya akun?'}{' '}
              <button type="button" onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}>
                {mode === 'register' ? 'Masuk' : 'Daftar'}
              </button>
            </p>
          </>
        ) : (
          <>
            <div className="lg-tabs">
              <button type="button" className="lg-tab on">
                NOMOR HP
              </button>
              <button type="button" className="lg-tab" onClick={() => setView('main')}>
                EMAIL
              </button>
            </div>
            <input
              className="lg-in"
              type="tel"
              placeholder="Nomor HP (contoh 0812xxxx)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={codeSent}
              autoComplete="tel"
            />
            {codeSent && (
              <input
                className="lg-in"
                inputMode="numeric"
                placeholder="Kode 6 digit"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitPhone()}
              />
            )}
            {msg ? <div className="lg-msg">{msg}</div> : null}
            <button type="button" className="lg-btn blue" onClick={submitPhone} disabled={busy}>
              {busy ? 'Memproses...' : codeSent ? 'Verifikasi' : 'Kirim Kode'}
            </button>
            {codeSent && (
              <p className="lg-switch">
                <button
                  type="button"
                  onClick={() => {
                    setCodeSent(false);
                    setCode('');
                    setMsg('');
                  }}
                >
                  Ganti nomor
                </button>
              </p>
            )}
          </>
        )}
        <div id="recaptcha-box" />
      </div>
    </div>
  );
}
