import { themeCss } from '@/lib/theme-css';

/**
 * The design tokens (colours, fonts, widths, easing) as a stylesheet, so no
 * <style> tag is needed in the document. Built once at build time: it only
 * changes when brand.ts does, and `themeCssHref()` puts a content hash in the
 * URL so the year-long immutable cache can never serve a stale palette.
 *
 * No locale prefix and a file extension, so the i18n middleware leaves it alone.
 */
export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(themeCss(), {
    headers: {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
