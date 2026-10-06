'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { LineMeta } from '@/lib/cart-model';
import { pieceType } from '@/lib/product-model';
import type { ApiProduct } from '@/types/api';

/**
 * What the bag needs to know about each product in it that the cart line does
 * not say: its type (a commission carries a deposit), its category, and its whole
 * price. Fetched once per product and language, then remembered for the session.
 */
const known = new Map<string, LineMeta>();

export function useLineMeta(slugs: readonly string[]): ReadonlyMap<string, LineMeta> {
  const locale = useLocale();
  const [, refresh] = useState(0);
  const key = slugs.join('|');

  useEffect(() => {
    const missing = slugs.filter((slug) => !known.has(`${locale}:${slug}`));
    if (missing.length === 0) return;
    let live = true;
    Promise.all(
      missing.map((slug) =>
        api<ApiProduct>(`/catalog/products/${encodeURIComponent(slug)}`, { query: { locale } })
          .then((product) => {
            known.set(`${locale}:${slug}`, {
              type: pieceType(product.tags),
              basePrice: product.basePrice,
              category: product.category?.name ?? '',
            });
          })
          // A product that cannot be read leaves its line as a plain line: no deposit note, no guess.
          .catch(() => undefined),
      ),
    ).then(() => live && refresh((count) => count + 1));
    return () => {
      live = false;
    };
    // `key` stands for `slugs`: the array itself is a new object each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, locale]);

  const result = new Map<string, LineMeta>();
  for (const slug of slugs) {
    const meta = known.get(`${locale}:${slug}`);
    if (meta) result.set(slug, meta);
  }
  return result;
}
