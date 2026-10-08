'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useAuthedQuery } from '@/lib/use-authed-query';
import type { PaymentToConfirm } from '@/types/api';
import { useDesk } from './DeskShell';
import { Amount, LoadState, PaymentActions, Receipt, useProviderLabel, useStamp } from './parts';

/**
 * Bank transfers waiting for a person. Each one says how much, from whom, under
 * which reference and whether a receipt came in, so it can be matched against
 * the statement and confirmed without opening the order.
 */
export function PaymentsQueue() {
  const t = useTranslations('desk');
  const stamp = useStamp();
  const provider = useProviderLabel();
  const { refresh } = useDesk();
  const { state, reload } = useAuthedQuery<PaymentToConfirm[]>('/admin/payments/awaiting-approval');
  const [notice, setNotice] = useState('');

  return (
    <>
      <div className="desk-head">
        <h1 className="serif desk-title">{t('paymentsTitle')}</h1>
        <p className="bag-muted">{t('paymentsLead')}</p>
      </div>
      {notice ? (
        <p className="desk-notice" role="status">
          {notice}
        </p>
      ) : null}

      {state.status !== 'ready' ? (
        <LoadState status={state.status} onRetry={reload} />
      ) : state.data.length === 0 ? (
        <div className="desk-card">
          <span className="serif desk-empty">{t('noPayments')}</span>
        </div>
      ) : (
        <ul className="desk-cards">
          {state.data.map((payment) => (
            <li key={payment.id} className="desk-card">
              <div className="desk-state-line">
                <Link className="serif desk-number" href={`/desk/orders/${encodeURIComponent(payment.order.id)}`}>
                  <bdi dir="ltr">{payment.order.number}</bdi>
                </Link>
                <span className="serif desk-money">
                  <Amount minor={payment.amount} />
                </span>
              </div>
              <p className="desk-line">{payment.order.guestName ?? '—'}</p>
              <p className="bag-muted-sm">
                {provider(payment.provider)} · {stamp(payment.createdAt)}
              </p>
              {payment.reference ? (
                <p className="bag-muted-sm">
                  {t('reference')}: <bdi dir="ltr">{payment.reference}</bdi>
                </p>
              ) : null}
              <Receipt url={payment.receiptUrl} />
              <PaymentActions
                payment={payment}
                name={payment.order.guestName}
                onDone={(message) => {
                  setNotice(message);
                  refresh();
                  reload();
                }}
              />
              <Link className="navlink" href={`/desk/orders/${encodeURIComponent(payment.order.id)}`}>
                {t('openOrder')}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
