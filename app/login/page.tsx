'use client';

import './login.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { APP } from '@/lib/config';

type Method = 'email' | 'phone';

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, loginGoogle, loginEmail, registerEmail, sendPhoneCode, confirmPhoneCode } = useAuth();
  const [method, setMethod] = useState<Method>('email');
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (ready && user) router.replace('/settings');
  }, [ready, user, router]);

  const run = async (fn: () => Promise<string | null>, after?: () => void) => {
    setBusy(true);
    setErr('');
    const e = await fn();
    setBusy(false);
    if (e) setErr(e);
    else after?.();
  };

  const submitEmail = () => {
    if (!email.trim() || !pass) {
      setErr('Isi email dan password.');
      return;
    }
    if (pass.length < 6) {
      setErr('Password minimal 6 karakter.');
      return;
    }
    run(() => (register ? registerEmail(email, pass) : loginEmail(email, pass)));
  };

  const submitPhone = () => {
    if (!codeSent) {
      if (phone.replace(/\D/g, '').length < 8) {
        setErr('Isi nomor HP yang valid.');
        return;
      }
      run(() => sendPhoneCode(phone), () => setCodeSent(true));
    } else {
      if (code.trim().length < 6) {
        setErr('Masukkan 6 digit kode.');
        return;
      }
      run(() => confirmPhoneCode(code));
    }
  };

  return (
    <>
      <div className="back-row">
        <Link href="/settings" className="round-btn" aria-label="Kembali">
          <ChevronLeft size={22} />
        </Link>
      </div>
      <h1 className="page-title">Masuk</h1>
      <p className="page-sub">Simpan Disukai, playlist, dan riwayatmu di semua perangkat.</p>

      <div className="auth-card glass-soft">
        <button type="button" className="pill-btn block" onClick={() => run(loginGoogle)} disabled={busy}>
          Lanjutkan dengan Google
        </button>

        <div className="auth-or">atau</div>

        <div className="auth-tabs">
          <button type="button" className={`auth-tab${method === 'email' ? ' active' : ''}`} onClick={() => { setMethod('email'); setErr(''); }}>
            Email
          </button>
          <button type="button" className={`auth-tab${method === 'phone' ? ' active' : ''}`} onClick={() => { setMethod('phone'); setErr(''); }}>
            Nomor HP
          </button>
        </div>

        {method === 'email' ? (
          <>
            <input className="auth-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <input
              className="auth-input"
              type="password"
              placeholder="Password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete={register ? 'new-password' : 'current-password'}
              onKeyDown={(e) => e.key === 'Enter' && submitEmail()}
            />
            <div className="auth-err">{err}</div>
            <button type="button" className="pill-btn accent block" onClick={submitEmail} disabled={busy}>
              {busy ? 'Memproses...' : register ? 'Buat akun' : 'Masuk'}
            </button>
            <p className="auth-switch">
              {register ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
              <button type="button" onClick={() => { setRegister(!register); setErr(''); }}>
                {register ? 'Masuk' : 'Daftar'}
              </button>
            </p>
          </>
        ) : (
          <>
            <input
              className="auth-input"
              type="tel"
              placeholder="Nomor HP (contoh 0812xxxx)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={codeSent}
              autoComplete="tel"
            />
            {codeSent && (
              <input
                className="auth-input"
                inputMode="numeric"
                placeholder="Kode 6 digit"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitPhone()}
              />
            )}
            <div className="auth-err">{err}</div>
            <button type="button" className="pill-btn accent block" onClick={submitPhone} disabled={busy}>
              {busy ? 'Memproses...' : codeSent ? 'Verifikasi' : 'Kirim kode'}
            </button>
            {codeSent && (
              <p className="auth-switch">
                <button type="button" onClick={() => { setCodeSent(false); setCode(''); setErr(''); }}>
                  Ganti nomor
                </button>
              </p>
            )}
          </>
        )}
      </div>

      <p className="auth-switch" style={{ marginTop: 22 }}>
        Dengan masuk, kamu setuju memakai {APP.name} secara wajar.
      </p>
      <div id="recaptcha-box" />
    </>
  );
}
