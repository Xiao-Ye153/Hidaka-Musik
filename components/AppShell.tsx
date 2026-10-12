'use client';

import type { ReactNode } from 'react';
import BottomNav from './BottomNav';
import MiniPlayer from './MiniPlayer';
import ThemeSheet from './ThemeSheet';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="page">{children}</main>
      <MiniPlayer />
      <BottomNav />
      <ThemeSheet />
    </>
  );
}
