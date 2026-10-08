import { useTranslations } from 'next-intl';

/**
 * The bag could not be fetched. Said once for the bag page and for checkout, so a
 * client whose bag is full is never told it is empty because the shop was slow to answer.
 */
export function BagLoadError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('bag');
  return (
    <div className="empty-page">
      <h1 className="serif">{t('loadError')}</h1>
      <button type="button" className="btn-gold" onClick={onRetry}>
        {t('retry')}
      </button>
    </div>
  );
}
