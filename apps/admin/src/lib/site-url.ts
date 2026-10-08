import { BRAND } from '@newax/shared';

/**
 * Where the storefront lives, for the "View store" link. The back office is
 * its own app on its own origin, so a relative `/en` would be a 404 here;
 * `NEXT_PUBLIC_SITE_URL` (the same variable the storefront's canonical URLs
 * use) names the real one, and the brand's canonical origin is the fallback.
 */
export const SITE_URL: string = process.env.NEXT_PUBLIC_SITE_URL || BRAND.identity.url;
