import type { SortKey as ApiSortKey } from '@/types/api';

/**
 * The collection page's query string, read defensively: it comes from the
 * address bar, so anything can be in it. What is not understood falls back to
 * the default instead of erroring.
 */
/** The orders the collection offers: the API also sorts by name, which no control here uses. */
export type SortKey = Exclude<ApiSortKey, 'name'>;

export const SORTS: readonly SortKey[] = ['featured', 'newest', 'price_desc', 'price_asc'];
export const DEFAULT_SORT: SortKey = 'featured';

export interface CollectionQuery {
  category?: string;
  sort: SortKey;
  page: number;
}

type Raw = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

export function parseCollectionQuery(raw: Raw): CollectionQuery {
  const sort = first(raw.sort);
  const page = Number.parseInt(first(raw.page) ?? '', 10);
  const category = first(raw.category)?.trim();
  return {
    category: category && /^[\w-]{1,60}$/.test(category) ? category : undefined,
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : DEFAULT_SORT,
    page: Number.isInteger(page) && page >= 1 && page <= 500 ? page : 1,
  };
}
