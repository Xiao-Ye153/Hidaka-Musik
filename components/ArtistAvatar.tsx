'use client';

import { useEffect, useState } from 'react';
import { cleanArtistName, searchTracks } from '@/lib/api';

const mem = new Map<string, string>();
let chain: Promise<void> = Promise.resolve();

function load(name: string): Promise<string> {
  const k = name.toLowerCase();
  const m = mem.get(k);
  if (m !== undefined) return Promise.resolve(m);
  try {
    const l = localStorage.getItem(`hm_athumb_${k}`);
    if (l) {
      mem.set(k, l);
      return Promise.resolve(l);
    }
  } catch {}
  const p = chain.then(async () => {
    let url = '';
    try {
      const r = await searchTracks(`${cleanArtistName(name) || name} official music`, 3);
      url = r.find((t) => t.thumb)?.thumb || '';
    } catch {}
    if (url) {
      mem.set(k, url);
      try {
        localStorage.setItem(`hm_athumb_${k}`, url);
      } catch {}
    }
    await new Promise((res) => setTimeout(res, 250));
    return url;
  });
  chain = p.then(
    () => {},
    () => {}
  );
  return p;
}

export default function ArtistAvatar({ name, size = 52 }: { name: string; size?: number }) {
  const [src, setSrc] = useState<string>(() => mem.get(name.toLowerCase()) ?? '');

  useEffect(() => {
    let off = false;
    load(name).then((u) => {
      if (!off && u) setSrc(u);
    });
    return () => {
      off = true;
    };
  }, [name]);

  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>
      {src ? <img src={src} alt="" referrerPolicy="no-referrer" /> : name.charAt(0).toUpperCase()}
    </span>
  );
}
