import { LOCALES } from '@newax/shared';

const LEADING_LOCALE = new RegExp(`^/(${LOCALES.join('|')})(?=/|$)`);

/**
 * Where to go after signing in. It comes from the address bar, so it is only
 * ever followed if it is a path on this site: a leading "//" or a scheme would
 * send a freshly signed-in client to someone else's page (an open redirect).
 */
export function safeNext(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f]/.test(value))
    return fallback;
  // The router adds the language itself; one already in the path would double it.
  return value.replace(LEADING_LOCALE, '') || fallback;
}
