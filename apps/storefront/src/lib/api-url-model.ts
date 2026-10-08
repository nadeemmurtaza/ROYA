/**
 * Where a server component reaches the API.
 *
 * Three deployments, one answer each:
 *   - local and Docker set `API_INTERNAL_URL`, the whole address including the
 *     path (`http://api:3001/api/v1`);
 *   - Vercel services inject `API_SERVICE_URL` at run time, the address of the
 *     API service. It carries no path, so the API's public path (the same
 *     `/api/v1` the browser calls) is appended here;
 *   - with neither, the address a developer's own API listens on.
 *
 * An explicit `API_INTERNAL_URL` wins, so a deployment can still point the
 * storefront at any API without touching the binding.
 */
export interface ServerApiUrlEnv {
  /** The full API address, path included. Set by hand. */
  internalUrl?: string;
  /** The API service's address, injected by a Vercel service binding. */
  serviceUrl?: string;
  /** The path the browser calls on its own origin (`NEXT_PUBLIC_API_URL`). */
  publicPath: string;
}

const LOCAL_API_URL = 'http://localhost:3001/api/v1';

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, '');

export function resolveServerApiUrl({ internalUrl, serviceUrl, publicPath }: ServerApiUrlEnv): string {
  if (internalUrl?.trim()) return trimTrailingSlashes(internalUrl.trim());
  // A service binding gives an origin; the public path must be a path to join to it.
  if (serviceUrl?.trim() && publicPath.startsWith('/')) {
    return `${trimTrailingSlashes(serviceUrl.trim())}${trimTrailingSlashes(publicPath)}`;
  }
  return LOCAL_API_URL;
}
