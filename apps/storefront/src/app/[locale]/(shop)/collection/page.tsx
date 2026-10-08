import type { Metadata } from 'next';
import { Image } from '@/components/Image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { connection } from 'next/server';
import { Suspense } from 'react';
import type { Locale } from '@newax/shared';
import { ProductCard } from '@/components/ProductCard';
import { SortSelect } from '@/components/SortSelect';
import { Link } from '@/i18n/navigation';
import { fetchCategories, fetchProducts } from '@/lib/catalog';
import { parseCollectionQuery } from '@/lib/collection-query';
import { image } from '@/lib/media';
import { toCard } from '@/lib/product-model';
import { alternatesFor } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'collection' });
  return { title: t('metaTitle'), description: t('metaDescription'), alternates: alternatesFor(locale, '/collection') };
}

const PAGE_SIZE = 24;

export default async function CollectionPage({ params, searchParams }: Props) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const query = parseCollectionQuery(await searchParams);
  const t = await getTranslations('collection');
  const common = await getTranslations('common');

  // The catalogue being unreachable is a state the page shows, not an error page.
  const [catalogue, categories] = await Promise.all([
    fetchProducts(locale as Locale, {
      category: query.category,
      sort: query.sort,
      page: query.page,
      pageSize: PAGE_SIZE,
    }).catch((error) => {
      console.error('Collection: could not load products', error);
      return null;
    }),
    fetchCategories(locale as Locale).catch(() => []),
  ]);

  const chip = (slug: string | undefined, label: string) => {
    const on = query.category === slug;
    return (
      <Link
        key={slug ?? 'all'}
        className={`chip${on ? ' chip-on' : ''}`}
        aria-current={on ? 'true' : undefined}
        href={{
          pathname: '/collection',
          query: { ...(slug ? { category: slug } : {}), ...(query.sort !== 'featured' ? { sort: query.sort } : {}) },
        }}
      >
        {label}
      </Link>
    );
  };

  const pageHref = (page: number) => ({
    pathname: '/collection' as const,
    query: {
      ...(query.category ? { category: query.category } : {}),
      ...(query.sort !== 'featured' ? { sort: query.sort } : {}),
      ...(page > 1 ? { page } : {}),
    },
  });

  return (
    <>
      <section aria-label={t('headerAria')} className="ph page-banner" data-keep="dark">
        <Image
          src={image('mehr-back-veil')}
          alt={t('headerAlt')}
          fill
          priority
          sizes="100vw"
          className="photo u-focus-35"
        />
        <div className="banner-shade" aria-hidden="true" />
        <div className="banner-copy">
          <nav className="breadcrumb" aria-label={t('breadcrumb')}>
            <Link href="/">{t('home')}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{t('title')}</span>
          </nav>
          <h1 className="serif banner-title fade">{t('title')}</h1>
          <p className="banner-lede fade">{t('lede')}</p>
        </div>
      </section>

      <section aria-label={t('filtersAria')} className="filters">
        <div role="group" aria-label={t('category')} className="chips">
          {chip(undefined, t('all'))}
          {categories.map((category) => chip(category.slug, category.name))}
        </div>
        <div className="sort-tools">
          <span aria-live="polite">{catalogue ? t('count', { count: catalogue.meta.total }) : ''}</span>
          <Suspense fallback={null}>
            <SortSelect value={query.sort} />
          </Suspense>
        </div>
      </section>

      <section aria-label={t('productsAria')} className="section collection-grid">
        {catalogue === null ? (
          <div className="empty-inline">
            <h2 className="serif">{t('unavailableTitle')}</h2>
            <p>{t('unavailableBody')}</p>
            {/* The page is rendered on request, so following its own address asks the catalogue again. */}
            <Link className="btn-gold" href={pageHref(query.page)}>
              {common('tryAgain')}
            </Link>
          </div>
        ) : catalogue.data.length === 0 ? (
          <div className="empty-inline">
            <h2 className="serif">{t('emptyTitle')}</h2>
            <p>{t('emptyBody')}</p>
            <Link className="btn-gold" href="/collection">
              {t('emptyCta')}
            </Link>
          </div>
        ) : (
          <div className="cgrid">
            {catalogue.data.map((product, index) => (
              <ProductCard
                key={product.slug}
                card={toCard(product)}
                priority={index < 3}
                sizes="(max-width: 700px) 50vw, (max-width: 1100px) 50vw, 33vw"
              />
            ))}
          </div>
        )}

        {catalogue && catalogue.meta.totalPages > 1 ? (
          <nav className="pager" aria-label={t('pagination')}>
            {catalogue.meta.hasPrevious ? (
              <Link className="btn-line" rel="prev" href={pageHref(query.page - 1)}>
                {t('previous')}
              </Link>
            ) : (
              <span />
            )}
            <span>{t('pageOf', { page: catalogue.meta.page, total: catalogue.meta.totalPages })}</span>
            {catalogue.meta.hasNext ? (
              <Link className="btn-line" rel="next" href={pageHref(query.page + 1)}>
                {t('next')}
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}

        <div className="appointment">
          <div className="ph appointment-photo" data-keep="dark">
            <Image
              src={image('mehr-portrait')}
              alt={t('apptAlt')}
              fill
              sizes="(max-width: 1000px) 100vw, 50vw"
              className="photo u-focus-25"
            />
          </div>
          <div className="appointment-copy">
            <span className="eyebrow">{t('apptEyebrow')}</span>
            <h2 className="serif appointment-title">{t('apptTitle')}</h2>
            <p>{t('apptBody')}</p>
            <Link className="btn-gold u-self-start" href={{ pathname: '/consultation', query: { kind: 'atelier' } }}>
              {t('apptCta')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
