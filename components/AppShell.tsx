'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';
import Extras from './Extras';
import FullPlayer from './FullPlayer';
import MiniPlayer from './MiniPlayer';
import PlaylistSheet from './PlaylistSheet';
import Splash from './Splash';
import ThemeSheet from './ThemeSheet';

export default function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();

  return (
    <Extras>
      <main className="page">
        <div key={path} className="page-in">
          {children}
        </div>
      </main>
      <MiniPlayer />
      <FullPlayer />
      <BottomNav />
      <ThemeSheet />
      <PlaylistSheet />
      <Splash />
    </Extras>
  );
}
