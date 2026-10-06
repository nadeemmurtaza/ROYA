import { handleOf, isFilled, whatsappUrl } from './brand-contact';

describe('isFilled', () => {
  it('treats a bracketed placeholder, whole or embedded, as not yet supplied', () => {
    expect(isFilled('[ATELIER ADDRESS]')).toBe(false);
    expect(isFilled('[X] weeks')).toBe(false);
    expect(isFilled('Unit 4 [CITY]')).toBe(false);
    expect(isFilled('')).toBe(false);
    expect(isFilled('   ')).toBe(false);
  });

  it('accepts a real value', () => {
    expect(isFilled('4–6 weeks')).toBe(true);
    expect(isFilled('Dubai Design District')).toBe(true);
  });
});

describe('handleOf', () => {
  it('takes the handle from a profile URL', () => {
    expect(handleOf('https://instagram.com/houseofroya.ae')).toBe('@houseofroya.ae');
    expect(handleOf('https://tiktok.com/@royawear.ae/')).toBe('@royawear.ae');
  });
});

describe('whatsappUrl', () => {
  it('is a wa.me link of digits only', () => {
    expect(whatsappUrl).toMatch(/^https:\/\/wa\.me\/\d+$/);
  });
});
