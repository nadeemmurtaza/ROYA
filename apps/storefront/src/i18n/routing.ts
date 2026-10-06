import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, LOCALES } from '@newax/shared';

/**
 * Locale routing: /en/... and /ar/....
 *
 * `localePrefix: 'always'` keeps both languages on explicit URLs, so an Arabic
 * product page is shareable and indexable in its own right instead of depending
 * on a cookie.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
});
