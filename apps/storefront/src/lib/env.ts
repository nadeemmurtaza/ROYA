/**
 * Where the API lives.
 *
 * The browser calls the storefront's own `/api/v1`, which next.config.mjs
 * rewrites to the API (see the note there for why). A server component cannot
 * use a relative URL, so it calls the API directly on `API_INTERNAL_URL`.
 */
const BROWSER_API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const SERVER_API_URL = process.env.API_INTERNAL_URL || 'http://localhost:3001/api/v1';

export const API_URL: string = typeof window === 'undefined' ? SERVER_API_URL : BROWSER_API_URL;

/** The canonical origin of this storefront, for metadata and the sitemap. */
export const SITE_URL: string = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
