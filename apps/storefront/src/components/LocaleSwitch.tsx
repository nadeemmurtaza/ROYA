'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { SECOND_LOCALE, DEFAULT_LOCALE, type Locale } from '@newax/shared';
import { Link, usePathname } from '@/i18n/navigation';

/** The same page in the other language, query string and all. */
export function LocaleSwitch() {
  const t = useTranslations('shell');
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const params = useSearchParams();

  const other: Locale = locale === DEFAULT_LOCALE ? SECOND_LOCALE : DEFAULT_LOCALE;
  const query = Object.fromEntries(params.entries());

  return (
    <Link
      href={{ pathname, query }}
      locale={other}
      hrefLang={other}
      lang={other}
      className="ar-link"
      aria-label={t('otherLanguageName')}
    >
      {t('otherLanguage')}
    </Link>
  );
}
