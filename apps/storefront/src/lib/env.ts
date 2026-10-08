import { resolveServerApiUrl } from './api-url-model';

/**
 * Where the API lives.
 *
 * The browser calls the storefront's own `/api/v1`, which is routed to the API
 * (a rewrite in next.config.mjs, or the platform's own routing on Vercel; see
 * the note there). A server component cannot use a relative URL, so it calls
 * the API directly: `API_INTERNAL_URL`, or the `API_SERVICE_URL` a Vercel
 * service binding injects (api-url-model.ts). Both are read here, at run time.
 */
const BROWSER_API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const SERVER_API_URL = resolveServerApiUrl({
  internalUrl: process.env.API_INTERNAL_URL,
  serviceUrl: process.env.API_SERVICE_URL,
  publicPath: BROWSER_API_URL,
});

export const API_URL: string = typeof window === 'undefined' ? SERVER_API_URL : BROWSER_API_URL;

/** The canonical origin of this storefront, for metadata and the sitemap. */
export const SITE_URL: string = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
