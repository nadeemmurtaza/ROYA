import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/env';

/** Everything public is open; the bag, checkout, account and an order's page are private to their owner. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/*/bag', '/*/checkout', '/*/account', '/*/dashboard', '/*/orders/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
