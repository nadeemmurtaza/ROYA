'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { BRAND } from '@newax/shared';
import { THEME_STORAGE_KEY } from '@/lib/theme-css';
import { MoonIcon, SunIcon } from './icons';

type ThemeName = 'dark' | 'light';

/**
 * The brand's default theme (light) is on :root and the other is a toggle,
 * remembered per visitor. The saved choice is applied before first paint by
 * themeBootScript (layout), so this button only has to read the result and flip it.
 */
export function ThemeToggle() {
  const t = useTranslations('shell');
  const [theme, setTheme] = useState<ThemeName>(BRAND.storefront.defaultTheme);

  useEffect(() => {
    const chosen = document.documentElement.dataset.theme;
    // No attribute means nothing was saved, so the page is in the default theme.
    setTheme(chosen === 'light' || chosen === 'dark' ? chosen : BRAND.storefront.defaultTheme);
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
