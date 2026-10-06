import type { Locale } from '@newax/shared';
import type { ApiProduct } from '@/types/api';
import { fetchCollection, fetchProducts } from './catalog';
import { toCard, type PieceCard } from './product-model';

/**
 * The pieces the Home page shows: the signature edit and what is new, each a
 * collection the atelier curates in the admin. A collection that is missing or
 * unreachable comes back empty rather than failing the page, and the page
 * leaves that section out: the editorial sections still render, and a visitor
 * never meets an error where a shelf should be.
 */
async function piecesOf(locale: Locale, collectionSlug: string): Promise<PieceCard[]> {
  try {
    const [collection, catalogue] = await Promise.all([
      fetchCollection(locale, collectionSlug),
      fetchProducts(locale, { pageSize: 100 }),
    ]);
    if (!collection) return [];
    const bySlug = new Map<string, ApiProduct>(catalogue.data.map((product) => [product.slug, product]));
    return collection.productSlugs.flatMap((slug) => {
      const product = bySlug.get(slug);
      return product ? [toCard(product)] : [];
    });
  } catch (error) {
    console.error(`Home: could not load the "${collectionSlug}" collection`, error);
    return [];
  }
}

export async function loadHome(locale: Locale): Promise<{ signature: PieceCard[]; arrivals: PieceCard[] }> {
  const [signature, arrivals] = await Promise.all([piecesOf(locale, 'signature'), piecesOf(locale, 'new')]);
  return { signature, arrivals };
}
