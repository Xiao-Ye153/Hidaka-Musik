'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';
import MiniPlayer from './MiniPlayer';
import Splash from './Splash';
import ThemeSheet from './ThemeSheet';

export default function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();

  return (
    <>
      <main className="page">
        <div key={path} className="page-in">
          {children}
        </div>
      </main>
      <MiniPlayer />
      <BottomNav />
      <ThemeSheet />
      <Splash />
    </>
  );
}