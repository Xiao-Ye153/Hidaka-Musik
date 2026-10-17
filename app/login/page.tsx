'use client';

import './login.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Phone } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { APP } from '@/lib/config';

type Mode = 'login' | 'signup';
type Panel = 'form' | 'phone-input' | 'phone-otp';

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('0')) return '+62' + digits.slice(1);
  if (digits.startsWith('62')) return '+' + digits;
  return '+62' + digits;
}

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, loginGoogle, loginEmail, registerEmail, resetPassword, sendPhoneCode, confirmPhoneCode } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [panel, setPanel] = useState<Panel>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace('/');
  }, [ready, user, router]);

  async function run(fn: () => Promise<string | null>, after?: () => void) {
    setError(null);
    setOk(false);
    setLoading(true);
    const e = await fn();
    setLoading(false);
    if (e) setError(e);
    else after?.();
  }

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    run(() => (mode === 'signup' ? registerEmail(name, email, password) : loginEmail(email, password)));
  }

  function handleForgot() {
    if (!email.trim()) {
      setError('Isi email dulu, lalu ketuk Lupa password.');
      return;
    }
    run(
      () => resetPassword(email),
      () => {
        setOk(true);
        setError('Link reset password sudah dikirim ke email kamu.');
      }
    );
  }

  function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    run(
      () => sendPhoneCode(phone),
      () => setPanel('phone-otp')
    );
  }

  function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    run(() => confirmPhoneCode(otp));
  }

  function backToForm() {
    setPanel('form');
    setOtp('');
    setError(null);
  }

  return (
    <div className="lg-root">
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Space+Grotesk:wght@700&display=swap"
        rel="stylesheet"
      />

      <div className="lg-top">
        <div className="lg-ring a" />
        <div className="lg-ring b" />
        <div className="lg-dot p" />
        <div className="lg-dot bl" />
        <div className="lg-dot w" />
        <div className="lg-logo">
          {APP.nameTop.charAt(0)}
          <img src="/icon-192.png" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
        </div>
        <div className="lg-brand">{APP.name.toUpperCase()}</div>
      </div>

      <div className="lg-sheet">
        <div className="lg-grip" />

        {panel === 'form' && (
          <>
            <div className="lg-tabs">
              <i style={{ transform: mode === 'signup' ? 'translateX(100%)' : 'translateX(0)' }} />
              <button
                type="button"
                className={`lg-tab${mode === 'login' ? ' on' : ''}`}
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
              >
                MASUK
              </button>
              <button
                type="button"
                className={`lg-tab${mode === 'signup' ? ' on' : ''}`}
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
              >
                DAFTAR
              </button>
            </div>

            <form onSubmit={handleEmailSubmit}>
              {mode === 'signup' && (
                <label className="lg-field">
                  <input className="lg-in" placeholder="Nama Lengkap" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </label>
              )}

              <label className="lg-field">
                <input
                  type="email"
                  required
                  className="lg-in"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>

              <label className="lg-field tight">
                <input
                  type="password"
                  required
                  minLength={6}
                  className="lg-in"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
              </label>

              {mode === 'login' && (
                <div className="lg-forgot">
                  <button type="button" onClick={handleForgot}>
                    Lupa password?
                  </button>
                </div>
              )}

              {error && <p className={`lg-err${ok ? ' ok' : ''}`}>{error}</p>}

              <button type="submit" disabled={loading} className="lg-btn blue">
                {loading ? 'Memproses...' : mode === 'signup' ? 'Daftar Sekarang' : 'Masuk'}
              </button>
            </form>

            <div className="lg-or">
              <i />
              <span>atau</span>
              <i />
            </div>

            <button type="button" disabled={loading} onClick={() => run(loginGoogle)} className="lg-btn white">
              <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.1-5.1l-6.5-5.5C29.6 35.4 27 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.5 5.5C39.9 37 44 31 44 24c0-1.3-.1-2.3-.4-3.5z" />
              </svg>
              Lanjutkan dengan Google
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setPanel('phone-input');
                setError(null);
              }}
              className="lg-btn mint"
            >
              <Phone size={18} />
              Lanjutkan dengan Nomor HP
            </button>
          </>
        )}

        {panel === 'phone-input' && (
          <div>
            <div className="lg-head">
              <button type="button" onClick={backToForm} className="lg-bk" aria-label="Kembali">
                <ArrowLeft size={15} />
              </button>
              <h1 className="lg-h1">Masukin Nomor HP</h1>
            </div>
            <p className="lg-sub">Kami bakal kirim kode OTP lewat SMS ke nomor ini.</p>

            <form onSubmit={handleSendOtp}>
              <label className="lg-field">
                <input type="tel" required className="lg-in" placeholder="08xxxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              </label>

              {error && <p className="lg-err">{error}</p>}

              <button type="submit" disabled={loading} className="lg-btn blue">
                {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          </div>
        )}

        {panel === 'phone-otp' && (
          <div>
            <div className="lg-head">
              <button type="button" onClick={() => setPanel('phone-input')} className="lg-bk" aria-label="Kembali">
                <ArrowLeft size={15} />
              </button>
              <h1 className="lg-h1">Masukin Kode OTP</h1>
            </div>
            <p className="lg-sub">Kode udah dikirim ke {normalizePhone(phone)}</p>

            <form onSubmit={handleVerifyOtp}>
              <label className="lg-field">
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  className="lg-in otp"
                  placeholder="------"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
              </label>

              {error && <p className="lg-err">{error}</p>}

              <button type="submit" disabled={loading} className="lg-btn blue">
                {loading ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
              </button>
            </form>
          </div>
        )}

        {panel === 'form' && (
          <p className="lg-foot">
            {mode === 'login' ? (
              <>
                Belum punya akun?{' '}
                <button type="button" onClick={() => setMode('signup')}>
                  Daftar
                </button>
              </>
            ) : (
              <>
                Udah punya akun?{' '}
                <button type="button" onClick={() => setMode('login')}>
                  Masuk
                </button>
              </>
            )}
          </p>
        )}
      </div>

      <div id="recaptcha-box" />
    </div>
  );
}