import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BRAND } from '@newax/shared';
/*
 * The storefront's typefaces, self-hosted (no request to a font CDN). Each
 * @font-face carries a unicode-range, so a file is fetched only when a glyph
 * in it is used: the Arabic faces cost nothing on a page with no Arabic.
 * Weights are the ones the back office uses: 400 body, 500 emphasis, 600 for
 * the few semibold headings.
 */
import '@fontsource/jost/latin-400.css';
import '@fontsource/jost/latin-500.css';
import '@fontsource/jost/latin-600.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cinzel/latin-400.css';
import '@fontsource/cinzel/latin-500.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css';
import '@fontsource/ibm-plex-sans-arabic/latin-400.css';
import '@/app/globals.css';
import { ThemeInitScript } from '@/components/ui/theme-init-script';

export const metadata: Metadata = {
  title: { default: BRAND.identity.adminName, template: `%s · ${BRAND.identity.adminName}` },
  // The back office must never be indexed.
  robots: { index: false, follow: false },
};

/**
 * The back office is English-only and sits outside the storefront's [locale]
 * routing, so it renders its own document. Only customer-facing text is
 * bilingual; staff tooling is one language by design.
 */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
