'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import AuthProvider from './AuthProvider';
import BottomNav from './BottomNav';
import CommentsSheet from './CommentsSheet';
import Extras from './Extras';
import I18nProvider from './I18nProvider';
import FullPlayer from './FullPlayer';
import MiniPlayer from './MiniPlayer';
import PlaylistSheet from './PlaylistSheet';
import ProgressProvider from './ProgressProvider';
import Splash from './Splash';
import ThemeSheet from './ThemeSheet';
import '../app/tweaks.css';

export default function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();

  return (
    <I18nProvider>
    <Extras>
      <AuthProvider>
        <ProgressProvider>
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
          <CommentsSheet />
          <Splash />
        </ProgressProvider>
      </AuthProvider>
    </Extras>
    </I18nProvider>
  );
}
