'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { BRAND } from '@newax/shared';
import { balanceDue, piecesIn, trunkIn } from '@/lib/cart-model';
import { whatsappUrl } from '@/lib/brand-contact';
import { formatPrice, vatIncluded } from '@/lib/money';
import { useLineMeta } from '@/lib/use-line-meta';
import type { Cart } from '@/types/api';
import { Price } from '@/providers/currency';

/** The order as it stands, beside every step: pieces, delivery, VAT and what is due today. */
export function OrderAside({ cart, shippingFee }: { cart: Cart; shippingFee: number | null }) {
  const t = useTranslations('checkout');
  const pieces = piecesIn(cart);
  const trunk = trunkIn(cart);
  const meta = useLineMeta(pieces.map((line) => line.slug));
  const owed = balanceDue(pieces, meta);
  const total = cart.totals.grandTotal + (shippingFee ?? 0);

  return (
    <aside aria-label={t('yourOrder')} className="summary">
      <span className="eyebrow">{t('yourOrder')}</span>
      <ul className="aside-lines">
        {pieces.map((line) => {
          const bespoke = meta.get(line.slug)?.type === 'bespoke';
          return (
            <li key={line.id}>
              <span className="ph aside-thumb">
                {line.imageUrl ? (
                  <Image
                    src={line.imageUrl}
                    alt=""
                    fill
                    sizes="64px"
                    className="photo"
                    style={{ objectPosition: '50% 25%' }}
                  />
                ) : null}
              </span>
              <span className="stack" style={{ gap: 4 }}>
                <span className="serif" style={{ fontSize: 18 }}>
                  {line.name}
                </span>
                {bespoke ? (
                  <span className="bag-muted-sm">
                    {t('deposit', { percent: BRAND.commerce.bespokeDepositPercent })}
                  </span>
                ) : null}
              </span>
              <span style={{ fontSize: 14 }}>
                <Price minor={line.unitPrice * line.quantity} charged />
              </span>
            </li>
          );
        })}
        {trunk ? (
          <li>
            <span aria-hidden="true" />
            <span className="serif" style={{ fontSize: 18 }}>
              {trunk.name}
            </span>
            <span style={{ fontSize: 14 }}>
              <Price minor={trunk.unitPrice} charged />
            </span>
          </li>
        ) : null}
      </ul>
      <div className="rule" />
      <dl className="summary-lines small">
        <div>
          <dt>{t('delivery')}</dt>
          <dd>{shippingFee === null ? '—' : shippingFee === 0 ? t('free') : <Price minor={shippingFee} charged />}</dd>
        </div>
        <div>
          <dt>{t('vatIncluded', { percent: BRAND.commerce.vatPercent })}</dt>
          <dd>
            <Price minor={vatIncluded(cart.totals.grandTotal)} charged />
          </dd>
        </div>
      </dl>
      <div className="due">
        <span className="label">{t('dueToday')}</span>
        <span className="serif due-amount">
          <Price minor={total} charged />
        </span>
      </div>
      <span className="bag-muted-sm">
        {owed > 0
          ? t('balance', { price: formatPrice(owed), currency: BRAND.locale.currency })
          : t('processed', { currency: BRAND.locale.currency })}
      </span>
      <div className="aside-help">
        <span className="serif" style={{ fontSize: 17, color: 'var(--text)' }}>
          {t('helpTitle')}
        </span>
        <span>
          {t.rich('help', {
            link: (chunks) => (
              <a href={whatsappUrl} rel="noopener" target="_blank">
                {chunks}
              </a>
            ),
          })}
        </span>
      </div>
    </aside>
  );
}
