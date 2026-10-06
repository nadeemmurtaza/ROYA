import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  /**
   * Storefront pages only. Excluded on purpose:
   *   api               Next route handlers
   *   checkout/callback a payment gateway returns here at a fixed, unprefixed
   *                     URL; a locale redirect could turn its POST into a GET
   *                     and lose the result
   *   _next, _vercel    framework assets
   *   media             the films and photographs
   *   files with an extension (favicon, robots, sitemap...)
   */
  matcher: ['/', '/((?!api|checkout/callback|media|_next|_vercel|.*\\..*).*)'],
};
