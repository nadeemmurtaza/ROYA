import { BRAND } from '@newax/shared';
import { convertMinor, formatFrom, formatPrice, isCurrency, vatIncluded } from './money';

describe('formatPrice', () => {
  it('prints whole dirhams without fils, with a thousands separator', () => {
    expect(formatPrice(2_850_000)).toBe('AED 28,500');
    expect(formatPrice(95_000)).toBe('AED 950');
  });

  it('keeps fils when there are some', () => {
    expect(formatPrice(123_450)).toBe('AED 1,234.50');
  });

  it('converts other currencies from the peg and rounds them to the nearest ten', () => {
    // AED 28,500 / 3.6725 = 7,760.4 -> 7,760
    expect(formatPrice(2_850_000, 'USD')).toBe('USD 7,760');
    // The riyal is pegged to the dirham at 3.75 / 3.6725, so 1 AED is about 1.0211 SAR.
    expect(convertMinor(100_000, 'SAR')).toBe(1_020);
  });

  it('uses Latin digits whatever the reader speaks', () => {
    expect(formatPrice(1_000_000)).toMatch(/^AED [0-9,]+$/);
  });

  it('puts a translated prefix in front', () => {
    expect(formatFrom('من', 2_850_000)).toBe('من AED 28,500');
  });
});

describe('isCurrency', () => {
  it('accepts exactly the currencies the brand offers', () => {
    for (const code of BRAND.storefront.currencies.codes) expect(isCurrency(code)).toBe(true);
    expect(isCurrency('PKR')).toBe(false);
    expect(isCurrency(undefined)).toBe(false);
  });
});

describe('vatIncluded', () => {
  it('extracts the 5% already inside a VAT-inclusive total', () => {
    // 10,500 includes 500 of VAT.
    expect(vatIncluded(1_050_000)).toBe(50_000);
    expect(vatIncluded(0)).toBe(0);
  });
});
