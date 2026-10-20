'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LANG_KEY, setCurrentLang, translate, type Lang } from '@/lib/i18n';

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (s: string, vars?: Record<string, string | number>) => string;
};

const C = createContext<Ctx | null>(null);

export function useI18n() {
  const c = useContext(C);
  if (!c) throw new Error('I18nContext');
  return c;
}

function detect(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'id' || saved === 'en' || saved === 'ru') return saved;
  } catch {}
  const n = (navigator.language || 'id').toLowerCase();
  if (n.startsWith('id') || n.startsWith('ms')) return 'id';
  if (n.startsWith('ru')) return 'ru';
  return 'en';
}

export default function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('id');

  useEffect(() => {
    const l = detect();
    setCurrentLang(l);
    document.documentElement.lang = l;
    setLangState(l);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setCurrentLang(l);
    document.documentElement.lang = l;
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {}
  }, []);

  const t = useCallback((s: string, vars?: Record<string, string | number>) => translate(lang, s, vars), [lang]);
  const value = useMemo<Ctx>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <C.Provider value={value}>{children}</C.Provider>;
}
