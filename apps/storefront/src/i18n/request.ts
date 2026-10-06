import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { BRAND } from '@newax/shared';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Without a timeZone next-intl falls back to the server's, which is not the
    // shop's, and a date rendered on the server would then disagree with the
    // same date in the browser (a hydration mismatch that only appears once
    // deployed). The shop's day is Dubai's.
    timeZone: BRAND.locale.timeZone,
  };
});
