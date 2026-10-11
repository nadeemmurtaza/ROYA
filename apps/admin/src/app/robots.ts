import type { MetadataRoute } from 'next';

/** The back office is for staff: nothing in it is for a search engine. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
