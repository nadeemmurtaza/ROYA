import type { MetadataRoute } from 'next';
import { DEFAULT_LOCALE, LOCALES } from '@newax/shared';
import { fetchProducts } from '@/lib/catalog';
import { SITE_URL } from '@/lib/env';

/** Pages with no data behind them; the order here is the order search engines see. */
const STATIC_PATHS = [
  '',
  '/collection',
  '/consultation',
  '/help/delivery',
  '/help/alterations',
  '/help/sizing',
  '/help/care',
  '/help/privacy',
  '/help/terms',
];

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The catalogue being unreachable must not take the sitemap down: list the static pages alone.
  const products = await fetchProducts(DEFAULT_LOCALE, { pageSize: 100 })
    .then((page) => page.data)
    .catch(() => []);
  const paths = [...STATIC_PATHS, ...products.map((product) => `/product/${product.slug}`)];

  return paths.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      alternates: { languages: Object.fromEntries(LOCALES.map((code) => [code, `${SITE_URL}/${code}${path}`])) },
    })),
  );
}
