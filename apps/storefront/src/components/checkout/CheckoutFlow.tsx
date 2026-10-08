'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FocusHeader } from '@/components/FocusHeader';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiError, api, apiAuthed } from '@/lib/api';
import { DEFAULT_EXTRAS, PRESENTATION_LABEL, balanceDue, parseExtras, piecesIn } from '@/lib/cart-model';
import { useLineMeta } from '@/lib/use-line-meta';
import {
  EMIRATES,
  EMPTY_DELIVERY,
  OUTSIDE,
  buildShippingAddress,
  composeNote,
  destinationCity,
  validateDelivery,
  type DeliveryErrors,
  type DeliveryField,
  type DeliveryForm,
} from '@/lib/checkout-model';
import type { AuthUser, Order, PaymentMethod, ShippingOption } from '@/types/api';
import { useCart } from '@/providers/cart';
import { useSession } from '@/providers/session';
import { EXTRAS_KEY } from '@/components/bag/BagView';
import { DeliveryStep, type OptionsState } from './DeliveryStep';
import { OrderAside } from './OrderAside';
import { PaymentStep, type PaymentsState } from './PaymentStep';
import { ReviewStep } from './ReviewStep';

export const CHECKOUT_KEY = 'roya.checkout';
export const LAST_ORDER_KEY = 'roya.order';

/** The order as the confirmation page is handed it (see placeOrder). */
export interface RememberedOrder {
  order: Order;
  bespoke: boolean;
  /** Fils still owed after today's deposits. */
  balance: number;
}

type Step = 1 | 2 | 3;

interface Saved {
  form: DeliveryForm;
  remarks: string;
  methodKey: string | null;
}

function readSaved(): Saved | null {
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

const OPTIONS_DEBOUNCE_MS = 350;

/**
 * Checkout, in three steps: delivery, payment, review. The API prices everything;
 * this collects an address, asks which delivery and payment method the shop
 * offers for it, and places the order once. Guests can buy: signing in only fills
 * the form in.
 */
export function CheckoutFlow() {
  const t = useTranslations('checkout');
  const focus = useTranslations('focus');
  const locale = useLocale();
  const router = useRouter();
  const cart = useCart();
  const session = useSession();

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<DeliveryForm>(EMPTY_DELIVERY);
  const [remarks, setRemarks] = useState('');
  const [touched, setTouched] = useState<ReadonlySet<DeliveryField>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [options, setOptions] = useState<OptionsState>({ status: 'idle' });
  const [methodKey, setMethodKey] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentsState>({ status: 'loading' });
  const [paymentKey, setPaymentKey] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restored = useRef(false);
  const idempotencyKey = useRef<string | null>(null);

  // What was typed survives a reload within the tab.
  useEffect(() => {
    const saved = readSaved();
    if (saved) {
      setForm({ ...EMPTY_DELIVERY, ...saved.form });
      setRemarks(saved.remarks ?? '');
      setMethodKey(saved.methodKey ?? null);
    }
    restored.current = true;
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    try {
      window.sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify({ form, remarks, methodKey } satisfies Saved));
    } catch {
      /* not remembering is fine */
    }
  }, [form, remarks, methodKey]);

  // A signed-in client starts with their details and default address filled in (only into empty fields).
  useEffect(() => {
    if (session.status !== 'signed-in') return;
    let live = true;
    Promise.all([
      apiAuthed<AuthUser>('/auth/me').catch(() => null),
      apiAuthed<
        Array<{
          fullName: string;
          phone: string;
          line1: string;
          line2: string | null;
          city: string;
          province: string;
          isDefault: boolean;
        }>
      >('/addresses').catch(() => []),
    ]).then(([me, addresses]) => {
      if (!live) return;
      const home = addresses.find((address) => address.isDefault) ?? addresses[0];
      setForm((current) => {
        const inUae = home ? EMIRATES.includes(home.city) : false;
        return {
          ...current,
          email: current.email || me?.email || '',
          fullName: current.fullName || home?.fullName || [me?.firstName, me?.lastName].filter(Boolean).join(' '),
          phone: current.phone || home?.phone || me?.phone || '',
          emirate: current.emirate || (home ? (inUae ? home.city : OUTSIDE) : ''),
          city: current.city || (home && !inUae ? home.city : ''),
          country: current.country || (home && !inUae ? home.province : ''),
          area: current.area || home?.line2 || '',
          line1: current.line1 || home?.line1 || '',
        };
      });
    });
    return () => {
      live = false;
    };
  }, [session.status]);

  // Payment methods the shop offers.
  useEffect(() => {
    let live = true;
    api<PaymentMethod[]>('/payments/methods')
      .then((items) => {
        if (!live) return;
        setPayments({ status: 'ready', items });
        setPaymentKey((current) => current ?? items[0]?.key ?? null);
      })
      .catch(() => live && setPayments({ status: 'error' }));
    return () => {
      live = false;
    };
  }, []);

  // Delivery options for where it is going: asked of the API, so the shop decides what it offers and charges.
  const city = destinationCity(form);
  const goods = cart.cart ? cart.cart.totals.itemsSubtotal + cart.cart.totals.stitchingSubtotal : 0;
  useEffect(() => {
    if (!city || !cart.cart) {
      setOptions({ status: 'idle' });
      return;
    }
    let live = true;
    setOptions({ status: 'loading' });
    const timer = window.setTimeout(() => {
      api<ShippingOption[]>('/shipping/options', { query: { city, subtotal: goods, locale } })
        .then((items) => {
          if (!live) return;
          setOptions({ status: 'ready', items });
          setMethodKey((current) =>
            current && items.some((item) => item.methodKey === current) ? current : (items[0]?.methodKey ?? null),
          );
        })
        .catch(() => live && setOptions({ status: 'error' }));
    }, OPTIONS_DEBOUNCE_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [city, goods, locale, cart.cart]);

  const errors: DeliveryErrors = useMemo(() => {
    const all = validateDelivery(form);
    if (showAll) return all;
    return Object.fromEntries(
      Object.entries(all).filter(([field]) => touched.has(field as DeliveryField)),
    ) as DeliveryErrors;
  }, [form, touched, showAll]);

  const pieces = piecesIn(cart.cart);
  const meta = useLineMeta(pieces.map((line) => line.slug));

  const chosen = options.status === 'ready' ? options.items.find((item) => item.methodKey === methodKey) : undefined;
  const payment = payments.status === 'ready' ? payments.items.find((item) => item.key === paymentKey) : undefined;
  const address = buildShippingAddress(form);
  const total = (cart.cart?.totals.grandTotal ?? 0) + (chosen?.fee ?? 0);

  function nextFromDelivery() {
    setShowAll(true);
    if (Object.keys(validateDelivery(form)).length > 0 || !chosen) return;
    setStep(2);
  }

  async function placeOrder() {
    if (!address || !chosen || !paymentKey || !cart.cart) return;
    setPlacing(true);
    setError(null);
    idempotencyKey.current ??= crypto.randomUUID();

    let extras = DEFAULT_EXTRAS;
    try {
      extras = parseExtras(window.sessionStorage.getItem(EXTRAS_KEY));
    } catch {
      /* no extras */
    }
    const note = composeNote({
      delivery: chosen.methodKey.replace(/_/g, ' '),
      presentation: PRESENTATION_LABEL[extras.presentation],
      giftNote: extras.giftNote,
      remarks,
    });

    try {
      // A signed-in client's order must carry their token, or it is placed as a guest's and never reaches their account.
      const send = session.status === 'signed-in' ? apiAuthed : api;
      const order = await send<Order>('/orders', {
        method: 'POST',
        query: { locale },
        headers: { 'Idempotency-Key': idempotencyKey.current },
        body: {
          shippingAddress: address,
          paymentMethod: paymentKey,
          email: form.email.trim(),
          shippingMethodKey: chosen.methodKey,
          ...(note ? { note } : {}),
        },
      });
      try {
        // What the confirmation page cannot work out from the order alone: whether it holds a commission, and the balance still to come.
        const remembered: RememberedOrder = {
          order,
          bespoke: [...meta.values()].some((info) => info.type === 'bespoke'),
          balance: balanceDue(pieces, meta),
        };
        window.sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(remembered));
        window.sessionStorage.removeItem(CHECKOUT_KEY);
        window.sessionStorage.removeItem(EXTRAS_KEY);
      } catch {
        /* the confirmation page can look the order up instead */
      }
      idempotencyKey.current = null;
      await cart.reload();
      // A hosted gateway takes the customer to its own page to pay; a bank transfer shows its details on ours.
      if (order.payment?.redirectUrl) window.location.assign(order.payment.redirectUrl);
      else router.replace(`/orders/${encodeURIComponent(order.number)}`);
    } catch (failure) {
      // A rejected order (4xx) can be corrected and resent under a fresh key; a lost connection or a
      // server error may have placed it, so the same key is kept and resending cannot duplicate it.
      if (failure instanceof ApiError && failure.status >= 400 && failure.status < 500) idempotencyKey.current = null;
      setError(failure instanceof Error ? failure.message : '');
      setPlacing(false);
    }
  }

  const stepLabels = [t('stepDelivery'), t('stepPayment'), t('stepReview')];

  if (!cart.loading && pieces.length === 0 && !placing) {
    return (
      <>
        <FocusHeader backHref="/bag" backLabel={focus('backToBag')} />
        <div className="bag-page">
          <div className="bag-empty">
            <span className="serif">{t('emptyTitle')}</span>
            <Link className="btn-gold" href="/collection">
              {t('emptyCta')}
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <FocusHeader backHref="/bag" backLabel={focus('backToBag')}>
        <ol aria-label={t('stepsAria')} className="steps-bar">
          {stepLabels.map((label, index) => {
            const n = index + 1;
            return (
              <li
                key={label}
                className={`ck-step${n === step ? ' ck-step-on' : n < step ? ' ck-step-done' : ''}`}
                aria-current={n === step ? 'step' : undefined}
              >
                <span className="num">{n < step ? '✓' : n}</span>
                {label}
              </li>
            );
          })}
        </ol>
        <div className="progress">
          <div className="bar" data-step={step} />
        </div>
      </FocusHeader>

      <div className="bag-page checkout-page">
        <div className="bag-main">
          {step === 1 ? (
            <DeliveryStep
              form={form}
              errors={errors}
              signedIn={session.status === 'signed-in'}
              options={options}
              methodKey={methodKey}
              remarks={remarks}
              onChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
              onBlur={(field) => setTouched((current) => new Set(current).add(field))}
              onMethod={setMethodKey}
              onRemarks={setRemarks}
              onNext={nextFromDelivery}
            />
          ) : null}
          {step === 2 ? (
            <PaymentStep
              payments={payments}
              paymentKey={paymentKey}
              onPick={setPaymentKey}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          ) : null}
          {step === 3 && address ? (
            <ReviewStep
              address={address}
              option={chosen}
              payment={payment}
              agreed={agreed}
              placing={placing}
              error={error}
              total={total}
              onAgree={setAgreed}
              onBack={() => setStep(2)}
              onPlace={() => void placeOrder()}
            />
          ) : null}
        </div>
        {cart.cart ? <OrderAside cart={cart.cart} shippingFee={chosen ? chosen.fee : null} /> : null}
      </div>
    </>
  );
}
