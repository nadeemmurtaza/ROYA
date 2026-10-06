import { BRAND } from '@newax/shared';
import type { ApiProduct } from '@/types/api';
import { SITE_URL } from './env';

/**
 * schema.org Product markup for a piece, so a search engine can show its price
 * and photograph. Prices are AED, VAT included. A piece that is made to order is
 * advertised as a pre-order, which is what it is, instead of "in stock".
 */
export function productJsonLd(product: ApiProduct, locale: string): Record<string, unknown> {
  const url = `${SITE_URL}/${locale}/product/${product.slug}`;
  const made = product.tags.includes('bespoke') || !product.inStock;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.metaDescription ?? product.description ?? undefined,
    sku: product.variants[0]?.sku,
    brand: { '@type': 'Brand', name: BRAND.identity.shortName },
    image: product.images.filter((image) => !/\.mp4$/i.test(image.url)).map((image) => `${SITE_URL}${image.url}`),
    url,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: BRAND.locale.currency,
      price: (product.basePrice / BRAND.locale.minorUnitsPerMajor).toFixed(2),
      availability: made ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock',
    },
  };
}
