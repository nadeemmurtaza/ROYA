'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useCart } from '@/providers/cart';
import { BagIcon } from './icons';

export function BagLink() {
  const t = useTranslations('shell');
  const { cart } = useCart();
  const count = cart?.itemCount ?? 0;

  return (
    <Link className="icon-btn has-badge" href="/bag" aria-label={t('bag', { count })}>
      <BagIcon />
      {count > 0 ? <span className="bag-count" aria-hidden="true">{count}</span> : null}
    </Link>
  );
}
