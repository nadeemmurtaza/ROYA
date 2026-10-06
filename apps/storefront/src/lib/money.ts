import { BRAND, DEFAULT_LOCALE, MINOR_UNITS_PER_MAJOR, intlTag } from '@newax/shared';

/**
 * Prices, as the design prints them: `AED 28,500`.
 *
 * Charges are always in the shop's own currency (AED); the other currencies in
 * the header are an indicative convenience, rounded so they read as approximate
 * (BRAND.storefront.currencies). Numerals are Latin in both languages, as in
 * the design's Arabic pages, so a price reads the same wherever it is shown.
 */
const { codes, perAed, roundTo } = BRAND.storefront.currencies;

export type CurrencyCode = (typeof codes)[number];

export const BASE_CURRENCY = BRAND.locale.currency as CurrencyCode;
export const CURRENCY_CODES: readonly CurrencyCode[] = codes;

export function isCurrency(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (codes as readonly string[]).includes(value);
}

/** Whole-number grouping with the shop's own separators, never the reader's locale's digits. */
const numbers = new Intl.NumberFormat(intlTag(DEFAULT_LOCALE), { maximumFractionDigits: 0 });
const numbersWithFils = new Intl.NumberFormat(intlTag(DEFAULT_LOCALE), {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** AED fils to a display amount in `currency`. Anything but AED is rounded to the nearest `roundTo`. */
export function convertMinor(minor: number, currency: CurrencyCode = BASE_CURRENCY): number {
  const major = minor / MINOR_UNITS_PER_MAJOR;
  if (currency === BASE_CURRENCY) return major;
  return Math.round((major * perAed[currency]) / roundTo) * roundTo;
}

/**
 * "AED 28,500". A fractional AED amount (a VAT line, a delivery of AED 12.50)
 * keeps its fils; a whole one does not print ".00".
 */
export function formatPrice(minor: number, currency: CurrencyCode = BASE_CURRENCY): string {
  const value = convertMinor(minor, currency);
  const fractional = currency === BASE_CURRENCY && minor % MINOR_UNITS_PER_MAJOR !== 0;
  return `${currency} ${(fractional ? numbersWithFils : numbers).format(value)}`;
}

/** "From AED 28,500": the prefix is the caller's word, not ours, because it is translated. */
export function formatFrom(prefix: string, minor: number, currency: CurrencyCode = BASE_CURRENCY): string {
  return `${prefix} ${formatPrice(minor, currency)}`;
}

/** What is included in a VAT-inclusive total: total × rate / (100 + rate), to the fils. */
export function vatIncluded(totalMinor: number, percent: number = BRAND.commerce.vatPercent): number {
  return Math.round((totalMinor * percent) / (100 + percent));
}
