'use client';

import { useEffect } from 'react';
import { THEMES } from '@/lib/themes';
import { useTheme } from './Providers';
import { useI18n } from '@/components/I18nProvider';

export default function ThemeSheet() {
  const { t: tr } = useI18n();
  const { theme, setTheme, sheetOpen, closeSheet } = useTheme();

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen, closeSheet]);

  return (
    <>
      <div className={`sheet-backdrop${sheetOpen ? ' open' : ''}`} onClick={closeSheet} />
      <section
        className={`sheet glass${sheetOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={tr("Pilih tema")}
        aria-hidden={!sheetOpen}
      >
        <div className="sheet-grip" />
        <h3>{tr("Pilih Tema")}</h3>
        <p>{tr("Tampilan berubah secara instan ke seluruh aplikasi")}</p>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`theme-opt${theme === t.id ? ' on' : ''}`}
              onClick={() => setTheme(t.id)}
            >
              <span
                className="theme-dot"
                style={{ background: `linear-gradient(135deg, ${t.base} 50%, ${t.accent} 50%)` }}
              />
              <span className="theme-name">{t.label}</span>
              <span className="theme-desc">{tr(t.desc)}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
