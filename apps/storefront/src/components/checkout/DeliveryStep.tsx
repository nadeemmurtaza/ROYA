'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  EMIRATES,
  OUTSIDE,
  isAbroad,
  type DeliveryErrors,
  type DeliveryField,
  type DeliveryForm,
} from '@/lib/checkout-model';
import { Price } from '@/providers/currency';
import type { ShippingOption } from '@/types/api';
import { Field, describedBy } from './Field';

export type OptionsState =
  { status: 'idle' } | { status: 'loading' } | { status: 'ready'; items: ShippingOption[] } | { status: 'error' };

interface Props {
  form: DeliveryForm;
  errors: DeliveryErrors;
  signedIn: boolean;
  options: OptionsState;
  methodKey: string | null;
  remarks: string;
  onChange: (field: DeliveryField, value: string) => void;
  onBlur: (field: DeliveryField) => void;
  onMethod: (key: string) => void;
  onRemarks: (value: string) => void;
  onNext: () => void;
}

const KNOWN_METHODS = ['white_glove', 'atelier_collection', 'international_courier'];

export function DeliveryStep({
  form,
  errors,
  signedIn,
  options,
  methodKey,
  remarks,
  onChange,
  onBlur,
  onMethod,
  onRemarks,
  onNext,
}: Props) {
  const t = useTranslations('checkout');
  const problem = (field: DeliveryField): string | undefined => {
    const code = errors[field];
    if (!code) return undefined;
    return code === 'required' ? t('errRequired') : code === 'email' ? t('errEmail') : t('errPhone');
  };
  const bind = (field: DeliveryField) => ({
    id: `d-${field}`,
    className: 'field',
    value: form[field],
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': describedBy(`d-${field}`),
    onChange: (event: { target: { value: string } }) => onChange(field, event.target.value),
    onBlur: () => onBlur(field),
  });
  const abroad = isAbroad(form);

  return (
    <section className="pane" aria-labelledby="delivery-title">
      <h1 id="delivery-title" className="serif">
        {t('stepDelivery')}
      </h1>
      {!signedIn ? (
        <p className="pane-note">
          {t.rich('guest', {
            link: (chunks) => <Link href={{ pathname: '/account', query: { next: '/checkout' } }}>{chunks}</Link>,
          })}
        </p>
      ) : null}

      <div className="field-grid">
        <Field id="d-email" label={t('email')} error={problem('email')}>
          <input
            {...bind('email')}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t('emailPlaceholder')}
          />
        </Field>
        <Field id="d-fullName" label={t('fullName')} error={problem('fullName')}>
          <input {...bind('fullName')} autoComplete="name" />
        </Field>
        <Field id="d-phone" label={t('phone')} error={problem('phone')}>
          <input
            {...bind('phone')}
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder={t('phonePlaceholder')}
            dir="ltr"
          />
        </Field>
        <Field id="d-emirate" label={t('emirate')} error={problem('emirate')}>
          <select {...bind('emirate')} autoComplete="address-level1">
            <option value="">{t('emirateChoose')}</option>
            {EMIRATES.map((emirate) => (
              <option key={emirate} value={emirate}>
                {emirate}
              </option>
            ))}
            <option value={OUTSIDE}>{t('outside')}</option>
          </select>
        </Field>
        {abroad ? (
          <>
            <Field id="d-city" label={t('city')} error={problem('city')}>
              <input {...bind('city')} autoComplete="address-level2" />
            </Field>
            <Field id="d-country" label={t('country')} error={problem('country')}>
              <input {...bind('country')} autoComplete="country-name" />
            </Field>
          </>
        ) : (
          <Field id="d-area" label={t('area')} error={problem('area')}>
            <input {...bind('area')} autoComplete="address-level3" placeholder={t('areaPlaceholder')} />
          </Field>
        )}
        <Field id="d-line1" label={t('line1')} error={problem('line1')} wide>
          <input {...bind('line1')} autoComplete="street-address" placeholder={t('line1Placeholder')} />
        </Field>
      </div>

      <div className="stack u-gap-14">
        <span className="lbl" id="method-label">
          {t('method')}
        </span>
        <div role="radiogroup" aria-labelledby="method-label" className="stack u-gap-14">
          {options.status === 'idle' ? <p className="bag-muted">{t('methodIdle')}</p> : null}
          {options.status === 'loading' ? (
            <p className="bag-muted" role="status">
              {t('methodChecking')}
            </p>
          ) : null}
          {options.status === 'error' ? (
            <p className="field-error" role="alert">
              {t('methodError')}
            </p>
          ) : null}
          {options.status === 'ready' && options.items.length === 0 ? (
            <p className="field-error" role="alert">
              {t('methodNone')}
            </p>
          ) : null}
          {options.status === 'ready'
            ? options.items.map((option) => {
                const on = option.methodKey === methodKey;
                return (
                  <button
                    key={option.methodKey}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`opt-row${on ? ' opt-row-on' : ''}`}
                    onClick={() => onMethod(option.methodKey)}
                  >
                    <span className={`dot${on ? ' dot-on' : ''}`} aria-hidden="true" />
                    <span className="stack u-gap-6">
                      <span className="serif opt-name">{option.label}</span>
                      <span className="opt-desc">
                        {KNOWN_METHODS.includes(option.methodKey) ? t(`method_${option.methodKey}`) : null}
                      </span>
                    </span>
                    <span className="opt-price">
                      {option.fee === 0 ? t('free') : <Price minor={option.fee} charged />}
                      <span className="opt-eta">{t('within', { days: option.etaMaxDays })}</span>
                    </span>
                  </button>
                );
              })
            : null}
        </div>
      </div>

      <div className="f">
        <label className="lbl" htmlFor="d-remarks">
          {t('remarks')}
        </label>
        <textarea
          id="d-remarks"
          className="field remarks"
          rows={2}
          maxLength={200}
          placeholder={t('remarksPlaceholder')}
          value={remarks}
          onChange={(event) => onRemarks(event.target.value)}
        />
      </div>

      {Object.keys(errors).length > 0 ? (
        <p className="field-error" role="alert">
          {t('fixErrors')}
        </p>
      ) : null}
      <div className="pane-actions end">
        <button
          type="button"
          className="btn-gold"
          onClick={onNext}
          disabled={options.status === 'ready' && options.items.length === 0}
        >
          {t('continuePayment')}
        </button>
      </div>
    </section>
  );
}
