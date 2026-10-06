'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { BRAND } from '@newax/shared';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { whatsappUrl } from '@/lib/brand-contact';
import {
  DEFAULT_EXTRAS,
  GIFT_NOTE_LIMIT,
  balanceDue,
  isMadeToMeasure,
  parseExtras,
  parseVariantLabel,
  piecesIn,
  trunkIn,
  type BagExtras,
  type Presentation,
} from '@/lib/cart-model';
import { formatPrice } from '@/lib/money';
import { useLineMeta } from '@/lib/use-line-meta';
import type { ApiProduct, CartLine } from '@/types/api';
import { Price } from '@/providers/currency';
import { useCart } from '@/providers/cart';
import { useWishlist } from '@/providers/wishlist';

export const EXTRAS_KEY = 'roya.bag';

const TYPE_KEY = { bespoke: 'typeBespoke', ready: 'typeReady', accessory: 'typeAccessory' } as const;

function loadExtras(): BagExtras {
  try {
    return parseExtras(window.sessionStorage.getItem(EXTRAS_KEY));
  } catch {
    return DEFAULT_EXTRAS;
  }
}

/** The bag: the pieces, how they will be presented, and what is due today. Amounts are what is charged, so they are always AED. */
export function BagView() {
  const t = useTranslations('bag');
  const product = useTranslations('product');
  const shades = useTranslations('shades');
  const fits = useTranslations('fits');
  const router = useRouter();
  const cart = useCart();
  const wishlist = useWishlist();

  const pieces = piecesIn(cart.cart);
  const trunk = trunkIn(cart.cart);
  const meta = useLineMeta(pieces.map((line) => line.slug));
  const owed = balanceDue(pieces, meta);

  const [extras, setExtras] = useState<BagExtras>(DEFAULT_EXTRAS);
  const [notice, setNotice] = useState<string | null>(null);
  // The trunk is a product the atelier sells; if it is not in the catalogue the option is simply not offered.
  const [trunkOffer, setTrunkOffer] = useState<{ variantId: string; price: number } | null>(null);

  // The saved choice comes back after mount (storage is not there on the server); a trunk already in the bag wins.
  useEffect(() => setExtras(loadExtras()), []);
  useEffect(() => {
    if (trunk)
      setExtras((current) => (current.presentation === 'trunk' ? current : { ...current, presentation: 'trunk' }));
  }, [trunk]);
  useEffect(() => {
    let live = true;
    api<ApiProduct>(`/catalog/products/${BRAND.storefront.featured.presentationTrunk}`)
      .then((found) => {
        const variant = found.variants[0];
        if (live && variant) setTrunkOffer({ variantId: variant.id, price: variant.price });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  function remember(next: BagExtras) {
    setExtras(next);
    try {
      window.sessionStorage.setItem(EXTRAS_KEY, JSON.stringify(next));
    } catch {
      /* the choice still holds on this page */
    }
  }

  async function choose(presentation: Presentation) {
    setNotice(null);
    const previous = extras;
    remember({ ...extras, presentation });
    if (presentation === 'trunk' && !trunk) {
      if (!trunkOffer || !(await cart.add(trunkOffer.variantId, 1))) {
        remember(previous);
        setNotice(t('updateFailed'));
      }
    } else if (presentation !== 'trunk' && trunk) {
      await cart.remove(trunk.id);
    }
  }

  async function moveToWishlist(line: CartLine) {
    setNotice(null);
    // Saving first, then removing: a line is never lost if the save fails.
    const outcome = wishlist.isSaved(line.productId) ? 'saved' : await wishlist.toggle(line.productId);
    if (outcome === 'needs-sign-in') router.push({ pathname: '/account', query: { next: '/bag' } });
    else if (outcome === 'failed') setNotice(t('updateFailed'));
    else await cart.remove(line.id);
  }

  function describe(line: CartLine): string {
    const { fit, shade } = parseVariantLabel(line.variantLabel);
    const shadeName = shade ? (shades.has(shade.toLowerCase()) ? shades(shade.toLowerCase()) : shade) : null;
    const fitName = fit ? (isMadeToMeasure(fit) ? fits('mtm') : fit) : null;
    return [shadeName, fitName].filter(Boolean).join(' · ');
  }

  if (cart.loading) {
    return (
      <div className="bag-page" aria-busy="true">
        <p className="bag-muted" role="status">
          {t('loading')}
        </p>
      </div>
    );
  }

  if (!cart.cart) {
    return (
      <div className="bag-page">
        <div className="bag-empty">
          <span className="serif">{t('loadError')}</span>
          <button type="button" className="btn-gold" onClick={() => void cart.reload()}>
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  const count = pieces.reduce((total, line) => total + line.quantity, 0);
  const options: Array<{ key: Presentation; name: string; description: string }> = [
    { key: 'box', name: t('presBoxName'), description: t('presBoxDesc') },
    ...(trunkOffer || trunk
      ? [
          {
            key: 'trunk' as const,
            name: t('presTrunkName'),
            description: t('presTrunkDesc', { price: formatPrice(trunk?.unitPrice ?? trunkOffer?.price ?? 0) }),
          },
        ]
      : []),
    { key: 'plain', name: t('presPlainName'), description: t('presPlainDesc') },
  ];

  return (
    <div className="bag-page">
      <div className="bag-main">
        <div className="bag-head">
          <h1 className="serif">{t('title')}</h1>
          <span className="bag-muted" aria-live="polite">
            {t('count', { count })}
          </span>
        </div>

        {pieces.length === 0 ? (
          <div className="bag-empty">
            <span className="serif">{t('emptyTitle')}</span>
            <span className="bag-muted">{t('emptyBody')}</span>
            <Link className="btn-gold" href="/collection">
              {t('emptyCta')}
            </Link>
          </div>
        ) : (
          <ul className="bag-lines">
            {pieces.map((line) => {
              const info = meta.get(line.slug);
              const bespoke = info?.type === 'bespoke';
              return (
                <li key={line.id} className="bag-line fade">
                  <Link href={`/product/${line.slug}`} className="ph bag-thumb" aria-label={line.name}>
                    {line.imageUrl ? (
                      <Image
                        src={line.imageUrl}
                        alt=""
                        fill
                        sizes="180px"
                        className="photo"
                        style={{ objectPosition: '50% 25%' }}
                      />
                    ) : null}
                  </Link>
                  <div className="bag-line-info">
                    {info ? (
                      <span className="eyebrow">{product(TYPE_KEY[info.type], { category: info.category })}</span>
                    ) : null}
                    <Link href={`/product/${line.slug}`} className="serif bag-name">
                      {line.name}
                    </Link>
                    <span className="bag-detail">
                      {describe(line)}
                      {info && info.type !== 'accessory' ? (
                        <>
                          <br />
                          {bespoke ? t('labelNote') : t('boxNote')}
                        </>
                      ) : null}
                    </span>
                    {bespoke ? <span className="bag-badge">{t('deposit')}</span> : null}
                    <div className="bag-actions">
                      <button
                        type="button"
                        className="lnk"
                        disabled={cart.busy}
                        onClick={() => void moveToWishlist(line)}
                      >
                        {t('moveToWishlist')}
                      </button>
                      <button
                        type="button"
                        className="lnk"
                        disabled={cart.busy}
                        onClick={() => void cart.remove(line.id)}
                      >
                        {t('remove')}
                      </button>
                    </div>
                  </div>
                  <div className="bag-price">
                    <span className="serif">
                      <Price minor={line.unitPrice * line.quantity} charged />
                    </span>
                    {bespoke && info ? (
                      <span className="bag-muted-sm">
                        {t('of', { price: formatPrice(info.basePrice * line.quantity) })}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {pieces.length > 0 ? (
          <section aria-labelledby="presentation-title" className="presentation">
            <h2 id="presentation-title" className="serif">
              {t('presentationTitle')}
            </h2>
            <div role="group" aria-label={t('presentationAria')} className="presentation-options">
              {options.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`opt-card${extras.presentation === option.key ? ' opt-card-on' : ''}`}
                  aria-pressed={extras.presentation === option.key}
                  disabled={cart.busy}
                  onClick={() => void choose(option.key)}
                >
                  <span className="serif">{option.name}</span>
                  <span className="bag-muted">{option.description}</span>
                </button>
              ))}
            </div>
            <label htmlFor="gift-note" className="lbl">
              {t('giftNote')}
            </label>
            <textarea
              id="gift-note"
              className="gift-note"
              rows={3}
              maxLength={GIFT_NOTE_LIMIT}
              placeholder={t('giftNotePlaceholder')}
              value={extras.giftNote}
              onChange={(event) => remember({ ...extras, giftNote: event.target.value })}
            />
          </section>
        ) : null}

        {notice ? (
          <p role="alert" className="field-error">
            {notice}
          </p>
        ) : null}
      </div>

      <aside aria-label={t('summaryTitle')} className="summary">
        <h2 className="serif">{t('summaryTitle')}</h2>
        {pieces.length > 0 ? (
          <dl className="summary-lines">
            {pieces.map((line) => (
              <div key={line.id}>
                <dt>
                  {meta.get(line.slug)?.type === 'bespoke' ? t('summaryDeposit', { name: line.name }) : line.name}
                </dt>
                <dd>
                  <Price minor={line.unitPrice * line.quantity} charged />
                </dd>
              </div>
            ))}
            <div>
              <dt>{t('summaryPresentation')}</dt>
              <dd>{trunk ? <Price minor={trunk.unitPrice} charged /> : t('complimentary')}</dd>
            </div>
            <div>
              <dt>{t('summaryDelivery')}</dt>
              <dd>{t('atCheckout')}</dd>
            </div>
          </dl>
        ) : null}
        <div className="rule" />
        <div className="due">
          <span className="label">{t('dueToday')}</span>
          <span className="serif due-amount">
            <Price minor={cart.cart.totals.grandTotal} charged />
          </span>
        </div>
        {owed > 0 ? <span className="bag-muted-sm">{t('balanceNote', { price: formatPrice(owed) })}</span> : null}
        <span className="bag-muted-sm">
          {t('vatNote', { percent: BRAND.commerce.vatPercent, currency: BRAND.locale.currency })}
        </span>
        {pieces.length > 0 ? (
          <>
            <Link className="btn-gold" href="/checkout">
              {t('checkout')}
            </Link>
            <p className="bag-muted-sm">{t('deliveryNote')}</p>
          </>
        ) : null}
        <p className="summary-help">
          {t.rich('arrange', {
            link: (chunks) => (
              <a href={whatsappUrl} rel="noopener" target="_blank">
                {chunks}
              </a>
            ),
          })}
        </p>
      </aside>
    </div>
  );
}
