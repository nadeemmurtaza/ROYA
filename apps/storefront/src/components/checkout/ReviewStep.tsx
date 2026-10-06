'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeft } from '@/components/icons';
import { Link } from '@/i18n/navigation';
import { Price } from '@/providers/currency';
import type { PaymentMethod, ShippingOption } from '@/types/api';
import { methodLabel } from './PaymentStep';

interface Props {
  address: { fullName: string; line1: string; line2?: string; city: string; province: string };
  option: ShippingOption | undefined;
  payment: PaymentMethod | undefined;
  agreed: boolean;
  placing: boolean;
  error: string | null;
  total: number;
  onAgree: (value: boolean) => void;
  onBack: () => void;
  onPlace: () => void;
}

export function ReviewStep({ address, option, payment, agreed, placing, error, total, onAgree, onBack, onPlace }: Props) {
  const t = useTranslations('checkout');
  const locale = useLocale();
  const place = [address.line2, address.city, address.province !== address.city ? address.province : undefined].filter(Boolean).join(', ');

  return (
    <section className="pane" aria-labelledby="review-title">
      <h1 id="review-title" className="serif">
        {t('reviewTitle')}
      </h1>
      <dl className="review-grid">
        <div>
          <dt className="lbl">{t('deliverTo')}</dt>
          <dd>
            {address.fullName}
            <br />
            {address.line1}
            <br />
            {place}
          </dd>
        </div>
        <div>
          <dt className="lbl">{t('deliveryLabel')}</dt>
          <dd>{option?.label}</dd>
        </div>
        <div>
          <dt className="lbl">{t('paymentLabel')}</dt>
          <dd>{payment ? methodLabel(payment, locale) : null}</dd>
        </div>
      </dl>

      <label className="terms">
        <input type="checkbox" checked={agreed} onChange={(event) => onAgree(event.target.checked)} />
        <span>{t.rich('terms', { link: (chunks) => <Link href="/help/terms">{chunks}</Link> })}</span>
      </label>

      {error ? (
        <p role="alert" className="field-error">
          {t('placeFailed')} {error}
        </p>
      ) : null}

      <div className="pane-actions">
        <button type="button" className="back" onClick={onBack}>
          <ChevronLeft size={16} />
          {t('backPayment')}
        </button>
        <span className="stack" style={{ alignItems: 'flex-end', gap: 8 }}>
          <button type="button" className="btn-gold" disabled={!agreed || placing} onClick={onPlace}>
            {placing ? (
              t('placing')
            ) : (
              <>
                {t('placeOrder')} <Price minor={total} charged />
              </>
            )}
          </button>
          {!agreed ? <span className="bag-muted-sm">{t('acceptTerms')}</span> : null}
        </span>
      </div>
    </section>
  );
}
