import { BRAND } from '@newax/shared';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { ChevronLeft } from './icons';

/**
 * The header for bag, checkout and confirmation: one way back, the logotype, and
 * a reassurance, with nothing else to leave through. A person with money in
 * their hand is not offered the whole shop (the design's focus layout).
 * `children` is the checkout's step indicator.
 */
export function FocusHeader({
  backHref,
  backLabel,
  children,
}: {
  backHref: string;
  backLabel: string;
  children?: ReactNode;
}) {
  const t = useTranslations('focus');

  return (
    <header className="focus-header">
      <div className="focus-bar">
        <Link href={backHref} className="back">
          <ChevronLeft size={16} />
          {backLabel}
        </Link>
        <Link href="/" aria-label={t('home')} className="focus-logo">
          <span className="logo shine">{BRAND.identity.shortName}</span>
        </Link>
        <span className="secure">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <rect x="5" y="10" width="14" height="10" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          {t('secure')}
        </span>
      </div>
      {children}
    </header>
  );
}
