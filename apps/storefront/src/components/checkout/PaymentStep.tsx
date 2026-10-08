'use client';

import { useLocale, useTranslations } from 'next-intl';
import { SECOND_LOCALE } from '@newax/shared';
import { ChevronLeft } from '@/components/icons';
import type { PaymentMethod } from '@/types/api';

export type PaymentsState = { status: 'loading' } | { status: 'ready'; items: PaymentMethod[] } | { status: 'error' };

interface Props {
  payments: PaymentsState;
  paymentKey: string | null;
  onPick: (key: string) => void;
  onBack: () => void;
  onNext: () => void;
}

/** The engine's method names and descriptions are stored per language; the second language's column is called "Ur" for historical reasons. */
export const methodLabel = (method: PaymentMethod, locale: string): string =>
  locale === SECOND_LOCALE ? method.labelUr || method.labelEn : method.labelEn;
const methodDescription = (method: PaymentMethod, locale: string): string | null =>
  locale === SECOND_LOCALE ? method.descriptionUr || method.descriptionEn : method.descriptionEn;

export function PaymentStep({ payments, paymentKey, onPick, onBack, onNext }: Props) {
  const t = useTranslations('checkout');
  const locale = useLocale();

  return (
    <section className="pane" aria-labelledby="payment-title">
      <h1 id="payment-title" className="serif">
        {t('paymentTitle')}
      </h1>

      {payments.status === 'loading' ? (
        <p className="bag-muted" role="status">
          {t('methodChecking')}
        </p>
      ) : null}
      {payments.status === 'error' ? (
        <p className="field-error" role="alert">
          {t('paymentError')}
        </p>
      ) : null}
      {payments.status === 'ready' && payments.items.length === 0 ? (
        <p className="field-error" role="alert">
          {t('paymentNone')}
        </p>
      ) : null}

      {payments.status === 'ready' && payments.items.length > 0 ? (
        <div role="radiogroup" aria-labelledby="payment-title" className="stack u-gap-14">
          {payments.items.map((method) => {
            const on = method.key === paymentKey;
            return (
              <button
                key={method.key}
                type="button"
                role="radio"
                aria-checked={on}
                className={`opt-row${on ? ' opt-row-on' : ''}`}
                onClick={() => onPick(method.key)}
              >
                <span className={`dot${on ? ' dot-on' : ''}`} aria-hidden="true" />
                <span className="stack u-gap-6">
                  <span className="serif opt-name">{methodLabel(method, locale)}</span>
                  <span className="opt-desc">{methodDescription(method, locale)}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {paymentKey === 'bank_transfer' ? (
        <div className="bank-panel">
          <span className="serif">{t('bankTitle')}</span>
          <span>{t('bankBody')}</span>
        </div>
      ) : null}

      <div className="pane-actions">
        <button type="button" className="back" onClick={onBack}>
          <ChevronLeft size={16} />
          {t('backDelivery')}
        </button>
        <button type="button" className="btn-gold" onClick={onNext} disabled={!paymentKey}>
          {t('reviewOrder')}
        </button>
      </div>
    </section>
  );
}
