'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { CloseIcon, MenuIcon } from './icons';
import { NAV } from './nav';

export function MobileMenu() {
  const t = useTranslations('shell');
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();

  // Following a link closes the menu; so does Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="nav-mob-btn"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? t('closeMenu') : t('openMenu')}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
        {t('menu')}
      </button>
      {open ? (
        <nav id={panelId} className="nav-mob-panel" aria-label={t('mobile')}>
          {NAV.map((item) => (
            <Link key={item.key} className="navlink" href={item.href}>
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}
