import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { BRAND, directionFor, type Locale } from '@newax/shared';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/env';
import { themeBootScript, themeCssHref } from '@/lib/theme-css';
import { Providers } from '@/providers';

/*
 * Fonts are self-hosted from @fontsource: no request to a font CDN (a privacy
 * and a speed win), and the Latin faces carry only the Latin glyphs. Each
 * @font-face has a unicode-range, so the browser fetches a file only for text
 * that actually uses it: an English page never downloads the Arabic faces.
 */
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cinzel/latin-400.css';
import '@fontsource/cinzel/latin-500.css';
import '@fontsource/jost/latin-300.css';
import '@fontsource/jost/latin-400.css';
import '@fontsource/jost/latin-500.css';
import '@fontsource/amiri/arabic-400.css';
import '@fontsource/amiri/arabic-700.css';
import '@fontsource/amiri/latin-400.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-300.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css';
import '@fontsource/ibm-plex-sans-arabic/latin-300.css';
import '@fontsource/ibm-plex-sans-arabic/latin-400.css';

import '@/styles/base.css';
import '@/styles/shell.css';
import '@/styles/home.css';
import '@/styles/shop.css';
import '@/styles/checkout.css';
import '@/styles/account.css';
import '@/styles/utility.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t('title'), template: `%s · ${BRAND.identity.shortName}` },
    description: t('description'),
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(routing.locales.map((code) => [code, `/${code}`])),
    },
    openGraph: {
      siteName: BRAND.identity.name,
      title: t('title'),
      description: t('description'),
      locale: BRAND.locale.intlTags[locale as Locale]?.replace('-', '_'),
      type: 'website',
      images: [{ url: '/media/images/mehr-walking-veil.jpg', width: 1440, height: 1919 }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: BRAND.storefront.themes[BRAND.storefront.defaultTheme].bg,
  colorScheme: 'light dark',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: 'common' });

  return (
    // suppressHydrationWarning: the boot script sets data-theme before React hydrates.
    <html lang={locale} dir={directionFor(locale as Locale)} suppressHydrationWarning>
      <head>
        {/* The tokens are a stylesheet like the rest: served from /theme.css, versioned by content so a rebrand busts the cache. */}
        <link rel="stylesheet" href={themeCssHref()} />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <a className="skip-link" href="#content">
          {t('skip')}
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
