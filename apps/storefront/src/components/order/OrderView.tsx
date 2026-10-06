'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, type FormEvent } from 'react';
import { BRAND, SECOND_LOCALE } from '@newax/shared';
import { Link } from '@/i18n/navigation';
import { api, apiAuthed } from '@/lib/api';
import { isFilled } from '@/lib/brand-contact';
import { formatPrice } from '@/lib/money';
import { image } from '@/lib/media';
import type { BankAccount, Order } from '@/types/api';
import { useSession } from '@/providers/session';
import { LAST_ORDER_KEY, type RememberedOrder } from '@/components/checkout/CheckoutFlow';

function readRemembered(number: string): RememberedOrder | null {
  try {
    const raw = window.sessionStorage.getItem(LAST_ORDER_KEY);
    const value = raw ? (JSON.parse(raw) as RememberedOrder) : null;
    return value && value.order.number === number ? value : null;
  } catch {
    return null;
  }
}

type State =
  | { status: 'loading' }
  | { status: 'found'; remembered: RememberedOrder }
  | { status: 'lookup' };

/**
 * The confirmation. It shows the order straight after it is placed (handed over
 * by checkout), or for a signed-in client any of their orders. A guest returning
 * later finds theirs with the order number and the mobile number they ordered
 * with, the same pair the API asks for.
 */
export function OrderView({ number }: { number: string }) {
  const t = useTranslations('order');
  const locale = useLocale();
  const session = useSession();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const remembered = readRemembered(number);
    if (remembered) {
      setState({ status: 'found', remembered });
      return;
    }
    if (session.status === 'loading') return;
    if (session.status === 'signed-in') {
      let live = true;
      apiAuthed<Order>(`/orders/${encodeURIComponent(number)}`)
        .then((order) => live && setState({ status: 'found', remembered: { order, bespoke: isCommission(order), balance: 0 } }))
        .catch(() => live && setState({ status: 'lookup' }));
      return () => {
        live = false;
      };
    }
    setState({ status: 'lookup' });
  }, [number, session.status]);

  if (state.status === 'loading') {
    return (
      <div className="confirm-page">
        <p className="bag-muted" role="status">
          {t('loading')}
        </p>
      </div>
    );
  }

  if (state.status === 'lookup') {
    return <Lookup number={number} onFound={(order) => setState({ status: 'found', remembered: { order, bespoke: isCommission(order), balance: 0 } })} />;
  }

  const { order, bespoke, balance } = state.remembered;
  const first = (order.guestName ?? order.shippingAddress?.fullName ?? '').trim().split(/\s+/)[0] ?? '';
  const accounts = (order.payment?.meta?.accounts ?? []).filter((account) => isFilled(account.iban) || isFilled(account.accountNumber));
  const bank = order.payment && order.payment.redirectUrl === null && order.payment.meta?.accounts !== undefined;
  const timeline = bespoke
    ? [
        [t('t1When'), t('t1Title'), t('t1Body')],
        [t('t2When'), t('t2Title'), t('t2Body')],
        [t('t3When'), t('t3Title'), balance > 0 ? t('t3Body', { price: formatPrice(balance) }) : ''],
      ]
    : [
        [t('r1When'), t('r1Title'), t('r1Body')],
        [t('r2When'), t('r2Title'), t('r2Body')],
      ];

  return (
    <div className="confirm-page">
      <svg className="seal" width="132" height="132" viewBox="0 0 140 140" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="70" cy="70" r="66" strokeWidth="1" />
        <circle className="inner" cx="70" cy="70" r="54" strokeWidth="0.6" />
        <path d="M50 71 L64 84 L91 57" strokeWidth="1.6" />
      </svg>

      <div className="rise d1 confirm-head">
        <span className="eyebrow">{t('eyebrow', { number: order.number })}</span>
        <h1 className="serif">{first ? t.rich('thanksName', { name: first, em: (chunks) => <em>{chunks}</em> }) : t('thanks')}</h1>
        <p>{bespoke ? t('ledeBespoke') : t('ledeReady')}</p>
      </div>

      {bank ? (
        <section className="rise d2 pay-panel" aria-labelledby="pay-title">
          <h2 id="pay-title" className="serif">
            {t('payTitle')}
          </h2>
          <p>{t('payBody', { amount: formatPrice(order.grandTotal) })}</p>
          <dl className="pay-details">
            <div>
              <dt>{t('payReference')}</dt>
              <dd dir="ltr">{order.number}</dd>
            </div>
            {accounts.map((account) => (
              <BankDetails key={account.iban || account.accountNumber} account={account} />
            ))}
          </dl>
          {accounts.length === 0 ? <p className="bag-muted">{t('payPending', { number: order.number })}</p> : null}
          {order.payment ? <ReceiptUpload paymentId={order.payment.paymentId} /> : null}
        </section>
      ) : null}

      <ol className="rise d2 timeline">
        {timeline.map(([when, title, body]) => (
          <li key={title}>
            <span className="serif when">{when}</span>
            <span className="serif what">{title}</span>
            {body ? <span className="bag-muted">{body}</span> : null}
          </li>
        ))}
      </ol>

      <div className="rise d3 btn-row" style={{ justifyContent: 'center' }}>
        <Link className="btn-gold" href={bespoke ? { pathname: '/consultation', query: { kind: 'atelier', order: order.number } } : '/collection'}>
          {t('bookConsultation')}
        </Link>
        <Link className="btn-line" href="/dashboard">
          {t('viewAccount')}
        </Link>
      </div>

      <div className="rise d4 confirm-box">
        <div className="ph confirm-box-photo">
          <Image src={image('roya-box')} alt={t('boxAlt')} fill sizes="(max-width: 700px) 100vw, 400px" className="photo" />
        </div>
        <div className="stack" style={{ padding: 36, justifyContent: 'center', gap: 12 }}>
          <span className="eyebrow">{t('boxEyebrow')}</span>
          <span className="serif" style={{ fontSize: 28 }}>
            {t('boxTitle')}
          </span>
          <span className="bag-muted">{t('boxBody')}</span>
        </div>
      </div>

      <ul className="confirm-items" aria-label={t('items')}>
        {order.items.map((item) => (
          <li key={item.id}>
            <span>{locale === SECOND_LOCALE && item.nameUr ? item.nameUr : item.nameEn}</span>
            <span dir="ltr">{formatPrice(item.lineTotal)}</span>
          </li>
        ))}
        <li>
          <span>{BRAND.locale.currency}</span>
          <strong dir="ltr">{formatPrice(order.grandTotal)}</strong>
        </li>
      </ul>
    </div>
  );
}

/** Without the catalogue to hand, a commission is recognised by its made-to-measure variant. */
function isCommission(order: Order): boolean {
  return order.items.some((item) => (item.variantLabel ?? '').startsWith('MTM'));
}

function BankDetails({ account }: { account: BankAccount }) {
  const t = useTranslations('order');
  return (
    <>
      {isFilled(account.bank) ? (
        <div>
          <dt>{t('payBank')}</dt>
          <dd>{account.bank}</dd>
        </div>
      ) : null}
      {isFilled(account.title) ? (
        <div>
          <dt>{t('payAccount')}</dt>
          <dd>{account.title}</dd>
        </div>
      ) : null}
      {isFilled(account.accountNumber) ? (
        <div>
          <dt>{t('payNumber')}</dt>
          <dd dir="ltr">{account.accountNumber}</dd>
        </div>
      ) : null}
      {isFilled(account.iban) ? (
        <div>
          <dt>{t('payIban')}</dt>
          <dd dir="ltr">{account.iban}</dd>
        </div>
      ) : null}
    </>
  );
}

function ReceiptUpload({ paymentId }: { paymentId: string }) {
  const t = useTranslations('order');
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setState('sending');
    try {
      const body = new FormData();
      body.append('file', file);
      await api(`/payments/${encodeURIComponent(paymentId)}/receipt`, { method: 'POST', formData: body, expect: 'none' });
      setState('done');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') return <p role="status">{t('receiptDone')}</p>;

  return (
    <form className="receipt" onSubmit={submit}>
      <label htmlFor="receipt" className="lbl">
        {t('receiptTitle')}
      </label>
      <span className="bag-muted-sm">{t('receiptHelp')}</span>
      <input id="receipt" type="file" accept="image/*,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      <button type="submit" className="btn-line" disabled={!file || state === 'sending'}>
        {state === 'sending' ? t('receiptSending') : t('receiptSend')}
      </button>
      {state === 'error' ? (
        <p role="alert" className="field-error">
          {t('receiptFailed')}
        </p>
      ) : null}
    </form>
  );
}

function Lookup({ number, onFound }: { number: string; onFound: (order: Order) => void }) {
  const t = useTranslations('order');
  const [orderNumber, setOrderNumber] = useState(number);
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState('sending');
    try {
      const order = await api<Order>(`/orders/${encodeURIComponent(orderNumber.trim())}/track`, { method: 'POST', body: { phone } });
      onFound(order);
    } catch {
      setState('error');
    }
  }

  return (
    <div className="confirm-page">
      <form className="lookup" onSubmit={submit}>
        <h1 className="serif">{t('lookupTitle')}</h1>
        <p className="bag-muted">{t('lookupBody')}</p>
        <div className="f">
          <label className="lbl" htmlFor="lookup-number">
            {t('lookupNumber')}
          </label>
          <input id="lookup-number" className="field" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} dir="ltr" required />
        </div>
        <div className="f">
          <label className="lbl" htmlFor="lookup-phone">
            {t('lookupPhone')}
          </label>
          <input id="lookup-phone" className="field" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} dir="ltr" required />
        </div>
        {state === 'error' ? (
          <p role="alert" className="field-error">
            {t('lookupFailed')}
          </p>
        ) : null}
        <button type="submit" className="btn-gold" disabled={state === 'sending'}>
          {t('lookupCta')}
        </button>
      </form>
    </div>
  );
}
