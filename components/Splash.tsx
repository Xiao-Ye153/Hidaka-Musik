'use client';

import { useEffect, useState } from 'react';
import { APP } from '@/lib/config';

const NOTES = [
  { c: '♪', left: '8%', delay: '0s' },
  { c: '♫', left: '24%', delay: '2.1s' },
  { c: '♪', left: '46%', delay: '1s' },
  { c: '♫', left: '66%', delay: '3.2s' },
  { c: '♪', left: '82%', delay: '0.6s' },
  { c: '♫', left: '92%', delay: '2.6s' }
];

export default function Splash() {
  const [show, setShow] = useState(true);
  const [hide, setHide] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem('hm_splash') === '1';
    } catch {}
    if (seen) {
      setShow(false);
      return;
    }
    try {
      sessionStorage.setItem('hm_splash', '1');
    } catch {}
    const t1 = setTimeout(() => setHide(true), 1800);
    const t2 = setTimeout(() => setShow(false), 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!show) return null;

  return (
    <div className={`splash${hide ? ' hide' : ''}`} aria-hidden="true">
      {NOTES.map((n, i) => (
        <span key={i} className="note" style={{ left: n.left, animationDelay: n.delay }}>
          {n.c}
        </span>
      ))}
      <div className="vinyl-wrap">
        <div className="vinyl">
          <div className="vinyl-label">
            {APP.nameTop.charAt(0)}
            <img src="/icon-192.png" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
        </div>
      </div>
      <div className="splash-name">{APP.name}</div>
      <div className="splash-sub">Menyiapkan musikmu</div>
      <div className="splash-bar">
        <i />
      </div>
    </div>
  );
}