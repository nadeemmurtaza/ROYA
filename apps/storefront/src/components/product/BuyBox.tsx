'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { whatsappUrl } from '@/lib/brand-contact';
import {
  MADE_TO_MEASURE,
  fitsOf,
  shadesOf,
  variantFor,
  type PieceType,
} from '@/lib/product-model';
import type { ApiVariant } from '@/types/api';
import { Price } from '@/providers/currency';
import { useCart } from '@/providers/cart';
import { useWishlist } from '@/providers/wishlist';
import { HeartIcon } from '@/components/icons';

interface BuyBoxProps {
  productId: string;
  type: PieceType;
  variants: ApiVariant[];
  /** The whole price, in fils. */
  price: number;
}

const DEFAULT_SIZE = 'FR 38';

/**
 * Choosing and buying: shade, then (for a commission) made-to-measure or an
 * atelier size, then the one button. A commission is reserved with its deposit;
 * everything else is added at its price. Nothing here decides money: the cart
 * returns the figures and the bag prints them.
 */
export function BuyBox({ productId, type, variants, price }: BuyBoxProps) {
  const t = useTranslations('product');
  const router = useRouter();
  const pathname = usePathname();
  const cart = useCart();
  const wishlist = useWishlist();

  const shades = shadesOf(variants);
  const fits = fitsOf(variants);
  const sizes = fits.filter((fit) => fit !== MADE_TO_MEASURE);
  const hasMtm = fits.includes(MADE_TO_MEASURE);

  const [shade, setShade] = useState<string | null>(shades[0]?.name ?? null);
  const [mode, setMode] = useState<'mtm' | 'std'>(hasMtm ? 'mtm' : 'std');
  const [size, setSize] = useState<string | null>(sizes.includes(DEFAULT_SIZE) ? DEFAULT_SIZE : (sizes[0] ?? null));
  const [notice, setNotice] = useState<string | null>(null);

  const chosenFit = mode === 'mtm' ? MADE_TO_MEASURE : size;
  const variant = variantFor(variants, shade, chosenFit);
  const isBespoke = type === 'bespoke';
  const saved = wishlist.isSaved(productId);

  async function onAdd() {
    if (!variant) return;
    setNotice(null);
    const ok = await cart.add(variant.id, 1);
    if (ok) router.push('/bag');
    else setNotice(t('addFailed'));
  }

  async function onWishlist() {
    setNotice(null);
    const outcome = await wishlist.toggle(productId);
    if (outcome === 'needs-sign-in') router.push({ pathname: '/account', query: { next: pathname } });
    else if (outcome === 'failed') setNotice(t('addFailed'));
  }

  return (
    <>
      {shades.length > 0 ? (
        <div className="buy-group">
          <span className="buy-label">
            {t('shade')} · <span className="buy-value">{shade}</span>
          </span>
          <div role="group" aria-label={t('shade')} className="buy-row" style={{ gap: 12 }}>
            {shades.map((option) => (
              <button
                key={option.name}
                type="button"
                className={`sw${option.name === shade ? ' sw-on' : ''}`}
                aria-label={option.name}
                aria-pressed={option.name === shade}
                onClick={() => setShade(option.name)}
              >
                <span className="sw-dot" style={{ background: option.hex ?? 'transparent' }} />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="buy-group">
        {isBespoke && hasMtm ? (
          <>
            <div className="tabs" role="group" aria-label={t('fit')}>
              <button type="button" className={`tab${mode === 'mtm' ? ' tab-on' : ''}`} aria-pressed={mode === 'mtm'} onClick={() => setMode('mtm')}>
                {t('madeToMeasure')}
              </button>
              <button type="button" className={`tab${mode === 'std' ? ' tab-on' : ''}`} aria-pressed={mode === 'std'} onClick={() => setMode('std')}>
                {t('atelierSizes')}
              </button>
            </div>
            {mode === 'mtm' ? <p className="buy-note">{t('mtmNote')}</p> : null}
          </>
        ) : null}

        {mode === 'std' && sizes.length > 0 ? (
          <>
            <div role="group" aria-label={t('size')} className="buy-row" style={{ gap: 10 }}>
              {sizes.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`opt${option === size ? ' opt-on' : ''}`}
                  aria-pressed={option === size}
                  onClick={() => setSize(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            {sizes.length > 1 ? (
              <Link className="size-guide" href="/help/sizing">
                {t('sizeGuide')}
              </Link>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="buy-group" style={{ gap: 12 }}>
        <button type="button" className="btn-gold" disabled={!variant || cart.busy} onClick={onAdd}>
          {cart.busy ? (
            t('adding')
          ) : (
            <>
              {t(isBespoke ? 'reserve' : 'add')} <Price minor={variant?.price ?? price} />
            </>
          )}
        </button>
        <Link className="btn-line" href={{ pathname: '/consultation', query: { kind: 'atelier' } }}>
          {t('fitting')}
        </Link>
        {notice ? (
          <p role="alert" className="field-error">
            {notice}
          </p>
        ) : null}
        <div className="buy-aside">
          <a className="aside-link" href={whatsappUrl} rel="noopener" target="_blank">
            {t('ask')}
          </a>
          <button type="button" className="aside-link" aria-pressed={saved} onClick={onWishlist}>
            <HeartIcon size={16} fill={saved ? 'currentColor' : 'none'} />
            {saved ? t('wishlistSaved') : t('wishlistAdd')}
          </button>
        </div>
      </div>
    </>
  );
}
