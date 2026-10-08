import { Image } from '@/components/Image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { PieceCard } from '@/lib/product-model';
import { Price } from '@/providers/currency';

/**
 * One piece in a grid: the cover photograph (a second one fades in on hover),
 * its category, name, blurb and price. The whole card is the link; the "Quick
 * view" chip is a hover cue, not a second control.
 */
export async function ProductCard({
  card,
  sizes = '(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw',
  priority = false,
}: {
  card: PieceCard;
  sizes?: string;
  priority?: boolean;
}) {
  const t = await getTranslations('common');

  return (
    <Link className="card blurin pcard" href={`/product/${card.slug}`}>
      <div className="ph pcard-photo" data-keep="dark">
        {card.cover ? (
          <div className="zoom">
            <Image src={card.cover.url} alt={card.cover.alt} fill sizes={sizes} className="photo" priority={priority} />
          </div>
        ) : null}
        {card.hover ? (
          <div className="alt">
            <Image src={card.hover} alt="" fill sizes={sizes} className="photo" />
          </div>
        ) : null}
        {card.tag ? <span className="pcard-tag">{card.tag}</span> : null}
        <span className="quick btn-gold" aria-hidden="true">
          {t('quickView')}
        </span>
      </div>
      <span className="pcard-meta">
        <span className="serif pcard-name">{card.name}</span>
        {card.blurb ? <span className="pcard-blurb">{card.blurb}</span> : null}
        <span className="pcard-price">
          <Price minor={card.price} prefix={card.isFrom ? t('from') : undefined} />
        </span>
      </span>
    </Link>
  );
}
