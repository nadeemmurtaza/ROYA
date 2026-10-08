import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * An empty bag, said once for the bag page and for checkout (which a person can
 * reach with nothing in it). It is a page of its own, not a hollow bag with an
 * empty summary beside it: one sentence, and the way back to the collection.
 */
export function EmptyBag() {
  const t = useTranslations('bag');
  return (
    <div className="empty-page">
      <h1 className="serif">{t('emptyTitle')}</h1>
      <p>{t('emptyBody')}</p>
      <Link className="btn-gold" href="/collection">
        {t('emptyCta')}
      </Link>
    </div>
  );
}
