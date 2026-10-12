'use client';

import { APP } from '@/lib/config';

export default function IconAvatar({ size }: { size?: number }) {
  const style = size
    ? { width: size, height: size, fontSize: Math.round(size * 0.4), position: 'relative' as const }
    : { position: 'relative' as const };

  return (
    <div className="avatar" style={style}>
      {APP.nameTop.charAt(0)}
      <img
        src="/icon-192.png"
        alt=""
        style={{ position: 'absolute', inset: 0 }}
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />
    </div>
  );
}