'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { type Locale } from '@newax/shared';
import { Field } from '@/components/checkout/Field';
import { ApiError, apiAuthed } from '@/lib/api';
import { canConfirm, canRefund, formatStamp, receiptHref } from '@/lib/desk-model';
import { formatPrice } from '@/lib/money';
import type { AdminPayment } from '@/types/api';

/** What a failed action says: the API's own words when it gave any, so the cause is on the screen. */
export function useFailure() {
  const t = useTranslations('desk');
  return (failure: unknown): string =>
    t('actionFailed', {
      reason: failure instanceof ApiError || failure instanceof Error ? failure.message : t('actionFailedGeneric'),
    });
}

/** Shown while a read loads, and when it could not be had. */
export function LoadState({ status, onRetry }: { status: 'loading' | 'error'; onRetry: () => void }) {
  const t = useTranslations('desk');
  return status === 'loading' ? (
    <p className="bag-muted" role="status">
      {t('loading')}
    </p>
  ) : (
    <div className="stack u-gap-12 u-items-start">
      <p className="field-error" role="alert">
        {t('loadFailed')}
      </p>
      <button type="button" className="btn-line" onClick={onRetry}>
        {t('retry')}
      </button>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const t = useTranslations('desk');
  return <span className={`desk-pill desk-pill-${status.toLowerCase()}`}>{t(`status_${status}`)}</span>;
}

export function PaymentPill({ state }: { state: string }) {
  const t = useTranslations('desk');
  return <span className={`desk-pill desk-pill-pay-${state}`}>{t(`pay_${state}`)}</span>;
}

/** The amount in the shop's own currency, exact: the desk deals in what was charged, not an indicative conversion. */
export const amount = (minor: number): string => formatPrice(minor);

/** Inside a translated sentence a component cannot go; Unicode's isolate marks do the same job. */
const isolate = (text: string): string => `\u2066${text}\u2069`;

/** The same, kept as one left-to-right run so Arabic text around it cannot reorder it. */
export function Amount({ minor }: { minor: number }) {
  return <bdi dir="ltr">{amount(minor)}</bdi>;
}

/** The words for a payment method, falling back to the key the engine uses. */
export function useProviderLabel() {
  const t = useTranslations('desk');
  return (provider: string): string => (t.has(`provider_${provider}`) ? t(`provider_${provider}`) : provider);
}

/**
 * Confirming that a bank transfer arrived, or recording that money went back.
 * Each is a two-step action: the first press names the amount and the
 * reference, so the person is looking at the bank statement when they agree.
 */
export function PaymentActions({
  payment,
  name,
  onDone,
}: {
  payment: AdminPayment;
  name?: string | null;
  onDone: (message: string) => void;
}) {
  const t = useTranslations('desk');
  const fail = useFailure();
  const [open, setOpen] = useState<'confirm' | 'refund' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!open) return;
    setBusy(true);
    setError('');
    try {
      await apiAuthed(
        `/admin/payments/${encodeURIComponent(payment.id)}/${open === 'confirm' ? 'approve' : 'refund'}`,
        {
          method: 'POST',
          body: note.trim() ? { note: note.trim() } : {},
        },
      );
      const done = open === 'confirm' ? t('confirmed') : t('refunded');
      setOpen(null);
      setNote('');
      onDone(done);
    } catch (failure) {
      setError(fail(failure));
    } finally {
      setBusy(false);
    }
  }

  if (!canConfirm(payment) && !canRefund(payment)) return null;

  if (!open) {
    return (
      <div className="desk-actions">
        {canConfirm(payment) ? (
          <button type="button" className="btn-gold" onClick={() => setOpen('confirm')}>
            {t('confirmPayment')}
          </button>
        ) : (
          <button type="button" className="btn-line" onClick={() => setOpen('refund')}>
            {t('refund')}
          </button>
        )}
      </div>
    );
  }

  const confirming = open === 'confirm';
  const id = `note-${payment.id}`;
  return (
    <form className="desk-confirm" onSubmit={submit}>
      <p role="group">
        {confirming
          ? name
            ? t('confirmPrompt', {
                amount: isolate(amount(payment.amount)),
                name,
                reference: isolate(payment.reference ?? payment.id),
              })
            : t('confirmPromptNoName', {
                amount: isolate(amount(payment.amount)),
                reference: isolate(payment.reference ?? payment.id),
              })
          : t('refundPrompt', { amount: isolate(amount(payment.amount)) })}
      </p>
      <Field id={id} label={t(confirming ? 'confirmNote' : 'refundNote')}>
        <input
          id={id}
          className="field"
          value={note}
          maxLength={300}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="desk-actions">
        <button type="submit" className="btn-gold" disabled={busy}>
          {busy ? t('moving') : t(confirming ? 'confirmYes' : 'refundYes')}
        </button>
        <button type="button" className="btn-line" disabled={busy} onClick={() => setOpen(null)}>
          {t(confirming ? 'confirmNo' : 'refundNo')}
        </button>
      </div>
    </form>
  );
}

/** The receipt a client uploaded, or the plain fact that there is none. */
export function Receipt({ url }: { url: string | null }) {
  const t = useTranslations('desk');
  return url ? (
    <a className="navlink" href={receiptHref(url)} target="_blank" rel="noopener noreferrer">
      {t('receiptView')}
    </a>
  ) : (
    <span className="bag-muted-sm">{t('receiptNone')}</span>
  );
}

export function useStamp() {
  const locale = useLocale() as Locale;
  return (value: string) => formatStamp(locale, value);
}
