'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { SECOND_LOCALE, type Locale } from '@newax/shared';
import { Link } from '@/i18n/navigation';
import { addressLines, mailLink, noteLines, paymentState, phoneLink, whatsappLink } from '@/lib/desk-model';
import { vatIncluded } from '@/lib/money';
import { useAuthedQuery } from '@/lib/use-authed-query';
import type { AdminOrder, AdminPayment } from '@/types/api';
import { useDesk } from './DeskShell';
import { OrderActions } from './OrderActions';
import { LoadState, PaymentActions, PaymentPill, Receipt, Amount, useProviderLabel, useStamp } from './parts';

/**
 * One order, with what the atelier does to it: the next step, the payment to
 * check, who the client is and where it goes, what was ordered, what the
 * client wrote, and everything that has happened to it.
 */
export function OrderDetail({ id }: { id: string }) {
  const t = useTranslations('desk');
  const locale = useLocale() as Locale;
  const stamp = useStamp();
  const { refresh } = useDesk();
  const { state, reload, setData } = useAuthedQuery<AdminOrder>(`/admin/orders/${encodeURIComponent(id)}`);
  const [notice, setNotice] = useState('');

  const back = (
    <Link href="/desk" className="back">
      {t('back')}
    </Link>
  );

  if (state.status !== 'ready') {
    return (
      <>
        {back}
        {/* An order that is not there is a plain answer, not a failure to retry. */}
        {state.status === 'error' && state.httpStatus === 404 ? (
          <p className="bag-muted" role="status">
            {t('orderNotFound')}
          </p>
        ) : (
          <LoadState status={state.status} onRetry={reload} />
        )}
      </>
    );
  }

  const order = state.data;
  const paid = paymentState(order.payments) === 'paid';
  const phone = order.guestPhone ?? order.shippingAddress?.phone ?? null;
  const contacts = [
    { href: whatsappLink(phone), label: t('viaWhatsApp'), external: true },
    { href: phoneLink(phone), label: t('viaPhone'), external: false },
    { href: mailLink(order.guestEmail), label: t('viaEmail'), external: false },
  ].filter((contact): contact is { href: string; label: string; external: boolean } => contact.href !== null);
  const address = addressLines(order.shippingAddress);
  const notes = noteLines(order.customerNote);
  const name = order.guestName ?? order.shippingAddress?.fullName ?? null;
  const vat = vatIncluded(order.grandTotal);

  const changed = (next: AdminOrder | null, message = '') => {
    setNotice(message);
    if (next) setData(next);
    else reload();
  };
  const paymentDone = (message: string) => {
    setNotice(message);
    refresh();
    reload();
  };

  return (
    <>
      {back}
      <div className="desk-head">
        <h1 className="serif desk-title">
          <bdi dir="ltr">{order.number}</bdi>
        </h1>
        <span className="bag-muted-sm">{t('placedOn', { date: stamp(order.placedAt) })}</span>
      </div>
      {notice ? (
        <p className="desk-notice" role="status">
          {notice}
        </p>
      ) : null}

      <div className="desk-split">
        <div className="desk-side">
          <section className="desk-card" aria-labelledby="d-next">
            <h2 id="d-next" className="eyebrow">
              {t('sectionNext')}
            </h2>
            <OrderActions key={order.status} order={order} paid={paid} onChanged={changed} />
          </section>

          <section className="desk-card" aria-labelledby="d-pay">
            <h2 id="d-pay" className="eyebrow">
              {t('sectionPayment')}
            </h2>
            {order.payments.length === 0 ? <PaymentPill state="none" /> : null}
            {order.payments.map((payment) => (
              <PaymentBlock key={payment.id} payment={payment} name={name} onDone={paymentDone} />
            ))}
          </section>

          <section className="desk-card" aria-labelledby="d-client">
            <h2 id="d-client" className="eyebrow">
              {t('sectionClient')}
            </h2>
            <p className="serif desk-name">{name ?? '—'}</p>
            {order.guestEmail ? (
              <p className="desk-line">
                <bdi dir="ltr">{order.guestEmail}</bdi>
              </p>
            ) : null}
            {phone ? (
              <p className="desk-line">
                <bdi dir="ltr">{phone}</bdi>
              </p>
            ) : null}
            {contacts.length > 0 ? (
              <div className="desk-actions">
                {contacts.map((contact) => (
                  <a
                    key={contact.label}
                    className="btn-line desk-small"
                    href={contact.href}
                    {...(contact.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {contact.label}
                  </a>
                ))}
              </div>
            ) : (
              <p className="bag-muted-sm">{t('noContact')}</p>
            )}
          </section>

          <section className="desk-card" aria-labelledby="d-delivery">
            <h2 id="d-delivery" className="eyebrow">
              {t('sectionDelivery')}
            </h2>
            {address.map((line) => (
              <p key={line} className="desk-line">
                {line}
              </p>
            ))}
            {order.shipments.length > 0 ? (
              <ul className="desk-plain">
                {order.shipments.map((shipment) => (
                  <li key={shipment.id} className="desk-line">
                    <span>{shipment.courier ?? '—'}</span>
                    {shipment.trackingNumber ? (
                      <>
                        {' · '}
                        <bdi dir="ltr">{shipment.trackingNumber}</bdi>
                      </>
                    ) : null}
                    {shipment.trackingUrl ? (
                      <>
                        {' · '}
                        <a className="navlink" href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer">
                          {t('shipmentTrack')}
                        </a>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>

        <div className="desk-body">
          <section className="desk-card" aria-labelledby="d-pieces">
            <h2 id="d-pieces" className="eyebrow">
              {t('sectionPieces')}
            </h2>
            <ul className="desk-plain desk-items">
              {order.items.map((item) => (
                <li key={item.id} className="desk-item">
                  <span className="stack u-gap-4 u-min-w-0">
                    <span className="serif desk-piece">
                      {locale === SECOND_LOCALE && item.nameUr ? item.nameUr : item.nameEn}
                    </span>
                    <span className="bag-muted-sm">
                      {[item.variantLabel, t('quantity', { count: item.quantity })].filter(Boolean).join(' · ')}
                    </span>
                    <span className="bag-muted-sm">
                      <bdi dir="ltr">{item.sku}</bdi>
                    </span>
                  </span>
                  <span className="desk-money">
                    <Amount minor={item.lineTotal} />
                  </span>
                </li>
              ))}
            </ul>
            <dl className="desk-totals">
              <div>
                <dt>{t('subtotal')}</dt>
                <dd>
                  <Amount minor={order.itemsSubtotal} />
                </dd>
              </div>
              <div>
                <dt>{t('shipping')}</dt>
                <dd>
                  <Amount minor={order.shippingFee} />
                </dd>
              </div>
              <div className="desk-total">
                <dt>{t('total')}</dt>
                <dd className="serif">
                  <Amount minor={order.grandTotal} />
                </dd>
              </div>
              <div>
                <dt>{t('vatIncluded')}</dt>
                <dd>
                  <Amount minor={vat} />
                </dd>
              </div>
            </dl>
          </section>

          {notes.length > 0 || order.staffNote ? (
            <section className="desk-card" aria-labelledby="d-notes">
              <h2 id="d-notes" className="eyebrow">
                {t('sectionNotes')}
              </h2>
              <dl className="desk-notes">
                {notes.map((line, index) => (
                  <div key={`${index}-${line.value}`}>
                    {line.label ? <dt>{line.label}</dt> : null}
                    <dd>{line.value}</dd>
                  </div>
                ))}
                {order.staffNote ? (
                  <div>
                    <dt>{t('noteStaff')}</dt>
                    <dd>{order.staffNote}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          <section className="desk-card" aria-labelledby="d-history">
            <h2 id="d-history" className="eyebrow">
              {t('sectionHistory')}
            </h2>
            <ol className="desk-plain desk-history">
              {[...order.statusEvents].reverse().map((event) => (
                <li key={event.id}>
                  <span>{t(`status_${event.toStatus}`)}</span>
                  <span className="bag-muted-sm">{stamp(event.createdAt)}</span>
                  {event.note && event.note !== 'Order placed' ? (
                    <span className="bag-muted-sm">{event.note}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}

/** One payment on the order: how, how much, the reference to find it by, the receipt, and what the desk can do about it. */
function PaymentBlock({
  payment,
  name,
  onDone,
}: {
  payment: AdminPayment;
  name: string | null;
  onDone: (message: string) => void;
}) {
  const t = useTranslations('desk');
  const stamp = useStamp();
  const provider = useProviderLabel();
  const state = paymentState([payment]);
  return (
    <div className="desk-payment">
      <div className="desk-state-line">
        <PaymentPill state={state} />
        <span className="serif desk-money">
          <Amount minor={payment.amount} />
        </span>
      </div>
      <p className="desk-line">{provider(payment.provider)}</p>
      {payment.reference ? (
        <p className="bag-muted-sm">
          {t('reference')}: <bdi dir="ltr">{payment.reference}</bdi>
        </p>
      ) : null}
      {payment.provider === 'bank_transfer' ? <Receipt url={payment.receiptUrl} /> : null}
      {payment.paidAt ? <p className="bag-muted-sm">{t('paidOn', { date: stamp(payment.paidAt) })}</p> : null}
      {payment.refundedAt ? (
        <p className="bag-muted-sm">{t('refundedOn', { date: stamp(payment.refundedAt) })}</p>
      ) : null}
      {payment.failureReason ? <p className="field-error">{payment.failureReason}</p> : null}
      <PaymentActions key={`${payment.id}-${payment.status}`} payment={payment} name={name} onDone={onDone} />
    </div>
  );
}
