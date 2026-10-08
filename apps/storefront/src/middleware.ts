import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  /**
   * Node.js, not the default Edge runtime. Vercel's `services` layout (see
   * vercel.json) refuses any Edge Function output, so an Edge middleware fails
   * the deploy with "Edge Runtime is not supported in services". Node.js
   * middleware is stable in Next 15.5; this one only reads the URL, a cookie
   * and Accept-Language, so it needs nothing the Edge runtime offered.
   */
  runtime: 'nodejs',
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
