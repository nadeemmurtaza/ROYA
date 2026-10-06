'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { BRAND } from '@newax/shared';
import { THEME_STORAGE_KEY } from '@/lib/theme-css';
import { MoonIcon, SunIcon } from './icons';

type ThemeName = 'dark' | 'light';

/**
 * Dark is the design's default and light a toggle, remembered per visitor. The
 * saved choice is applied before first paint by themeBootScript (layout), so
 * this button only has to read the result and flip it.
 */
export function ThemeToggle() {
  const t = useTranslations('shell');
  const [theme, setTheme] = useState<ThemeName>(BRAND.storefront.defaultTheme);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  }, []);

  function flip() {
    const next: ThemeName = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* the choice holds for this page only */
    }
  }

  return (
    <button
      type="button"
      className="tool-btn"
      onClick={flip}
      aria-label={theme === 'dark' ? t('themeToLight') : t('themeToDark')}
      title={t('theme')}
    >
      {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
    </button>
  );
}
