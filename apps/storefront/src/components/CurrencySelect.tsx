'use client';

import { useTranslations } from 'next-intl';
import { CURRENCY_CODES, isCurrency } from '@/lib/money';
import { useCurrency } from '@/providers/currency';

export function CurrencySelect() {
  const t = useTranslations('shell');
  const { currency, setCurrency } = useCurrency();

  return (
    <label className="tool-field">
      <span className="hide-sm">{t('currency')}</span>
      <select
        className="tool-select"
        aria-label={t('currency')}
        value={currency}
        onChange={(event) => {
          if (isCurrency(event.target.value)) setCurrency(event.target.value);
        }}
      >
        {CURRENCY_CODES.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </label>
  );
}
