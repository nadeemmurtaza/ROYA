import { request } from '@newax/shared';
import type { Locale } from '@newax/shared';
import type { ApiCollection, ApiProduct, Paged, SortKey } from '@/types/api';
import { API_URL } from './env';

/**
 * Server-side catalogue reads. The catalogue changes when the atelier edits
 * it, not on every request, so each read is cached for a minute: a page costs
 * the API one call per minute however busy the shop is, and an edit shows up
 * within that minute without a deploy.
 */
const REVALIDATE_SECONDS = 60;

const get = <T>(path: string, query: Record<string, unknown>) =>
  request<T>(API_URL, path, { query, revalidate: REVALIDATE_SECONDS });

export interface CatalogQuery {
  category?: string;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
  minPrice?: number;
  maxPrice?: number;
}

export function fetchProducts(locale: Locale, query: CatalogQuery = {}): Promise<Paged<ApiProduct>> {
  return get<Paged<ApiProduct>>('/catalog/products', { locale, pageSize: 24, ...query });
}

/** Null when the slug is unknown, so the page can 404 rather than error. */
export async function fetchProduct(locale: Locale, slug: string): Promise<ApiProduct | null> {
  try {
    return await get<ApiProduct>(`/catalog/products/${encodeURIComponent(slug)}`, { locale });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 404) return null;
    throw error;
  }
}

export interface ApiCategoryNode {
  id: string;
  slug: string;
  name: string;
  children?: ApiCategoryNode[];
}

export function fetchCategories(locale: Locale): Promise<ApiCategoryNode[]> {
  return get<ApiCategoryNode[]>('/catalog/categories', { locale });
}

export async function fetchCollection(locale: Locale, slug: string): Promise<ApiCollection | null> {
  try {
    return await get<ApiCollection>(`/collections/${encodeURIComponent(slug)}`, { locale });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 404) return null;
    throw error;
  }
}
