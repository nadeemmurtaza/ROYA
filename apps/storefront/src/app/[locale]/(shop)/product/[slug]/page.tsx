import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { BRAND, type Locale } from '@newax/shared';
import { Gallery } from '@/components/product/Gallery';
import { BuyBox } from '@/components/product/BuyBox';
import { ProductCard } from '@/components/ProductCard';
import { Link } from '@/i18n/navigation';
import { isFilled } from '@/lib/brand-contact';
import { fetchProduct, fetchProducts } from '@/lib/catalog';
import { depositOf, galleryOf, pieceType, splitDescription, toCard, type PieceType } from '@/lib/product-model';
import { alternatesFor, productJsonLd } from '@/lib/seo';
import { IndicativeNote, Price } from '@/providers/currency';

type Params = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await fetchProduct(locale as Locale, slug).catch(() => null);
  if (!product) return {};
  const cover = product.images.find((image) => !/\.mp4$/i.test(image.url));
  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? undefined,
    alternates: alternatesFor(locale, `/product/${slug}`),
    robots: product.tags.includes('noindex') ? { index: false } : undefined,
    openGraph: cover ? { images: [{ url: cover.url }] } : undefined,
  };
}

const TYPE_KEY: Record<PieceType, 'typeBespoke' | 'typeReady' | 'typeAccessory'> = {
  bespoke: 'typeBespoke',
  ready: 'typeReady',
  accessory: 'typeAccessory',
};

export default async function ProductPage({ params }: Params) {
  await connection();
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [product, catalogue] = await Promise.all([
    fetchProduct(locale as Locale, slug),
    fetchProducts(locale as Locale, { pageSize: 12, sort: 'featured' }).catch(() => null),
  ]);
  if (!product) notFound();

  const t = await getTranslations('product');
  const type = pieceType(product.tags);
  const { intro, sections } = splitDescription(product.description);
  const deposit = depositOf(product);
  const related = (catalogue?.data ?? [])
    .filter((other) => other.slug !== product.slug)
    .slice(0, 4)
    .map(toCard);

  // The facts every piece of that type shares. A lead time the atelier has not supplied yet is left out, not shown as "[X] weeks".
  const lead = type === 'bespoke' ? BRAND.commerce.stitchingTurnaroundTime : BRAND.commerce.standardDeliveryTime;
  const facts = [
    isFilled(lead) ? { key: type === 'bespoke' ? 'factReady' : 'factShips', value: lead } : null,
    type === 'bespoke' ? { key: 'factFittings', value: t('factFittingsValue') } : null,
    type !== 'accessory' ? { key: 'factLabel', value: t('factLabelValue') } : null,
    type === 'ready' ? { key: 'factBox', value: t('factBoxValue') } : null,
  ].filter((fact): fact is { key: string; value: string } => fact !== null);

  const drawers = [
    ...sections.map((section) => ({ title: section.title, body: section.body })),
    product.careInstructions ? { title: t('care'), body: product.careInstructions } : null,
  ].filter((drawer): drawer is { title: string; body: string } => drawer !== null);

  const categoryName = product.category?.name ?? '';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product, locale)) }}
      />
      <div className="product-page">
        <Gallery items={galleryOf(product)} />

        <div className="product-info fade">
          <nav className="breadcrumb" aria-label={t('breadcrumb')}>
            <Link href="/">{t('home')}</Link>
            <span aria-hidden="true">/</span>
            {product.category ? (
              <>
                <Link href={{ pathname: '/collection', query: { category: product.category.slug } }}>
                  {categoryName}
                </Link>
                <span aria-hidden="true">/</span>
              </>
            ) : null}
            <span aria-current="page">{product.name}</span>
          </nav>

          <div className="stack u-gap-12">
            <span className="eyebrow">{t(TYPE_KEY[type], { category: categoryName })}</span>
            <h1 className="serif product-name">{product.name}</h1>
            {intro ? <p className="product-intro">{intro}</p> : null}
            <span className="serif product-price">
              <Price minor={product.basePrice} prefix={type === 'bespoke' ? t('fromPrefix') : undefined} />
            </span>
            <span className="product-note">
              {type === 'bespoke'
                ? t('noteBespoke', { percent: BRAND.commerce.bespokeDepositPercent })
                : t('noteReady')}
              <IndicativeNote>{t('noteIndicative', { currency: BRAND.locale.currency })}</IndicativeNote>
            </span>
          </div>

          <BuyBox productId={product.id} type={type} variants={product.variants} price={deposit ?? product.basePrice} />

          {facts.length > 0 ? (
            <dl className="facts" data-count={facts.length}>
              {facts.map((fact) => (
                <div key={fact.key} className="fact">
                  <dt>{t(fact.key)}</dt>
                  <dd className="serif">{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {drawers.length > 0 ? (
            <div className="drawers">
              {drawers.map((drawer, index) => (
                <details key={drawer.title} className="acc" open={index === 0}>
                  <summary>
                    {drawer.title}
                    <span className="plus" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p>{drawer.body}</p>
                </details>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="related-title" className="section related">
          <h2 id="related-title" className="serif related-title">
            {t('relatedTitle')}
          </h2>
          <div className="pgrid">
            {related.map((card) => (
              <ProductCard key={card.slug} card={card} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
