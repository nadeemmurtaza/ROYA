import { isValidPhone, normalizeEmail, normalizePhone } from './phone';

describe('normalizePhone', () => {
  it.each([
    ['0501234567', '+971501234567'],
    ['050 1234567', '+971501234567'],
    ['050-123-4567', '+971501234567'],
    ['+971 50 1234567', '+971501234567'],
    ['971 50 1234567', '+971501234567'],
    ['00971501234567', '+971501234567'],
    ['501234567', '+971501234567'],
    ['(050) 1234567', '+971501234567'],
  ])('normalises %s to %s', (input, expected) => {
    expect(normalizePhone(input).e164).toBe(expected);
  });

  it('collapses every written form of one number to a single key', () => {
    const forms = ['0501234567', '+971 50 1234567', '00971-50-1234567', '971 50 1234 567'];
    const keys = new Set(forms.map((form) => normalizePhone(form).e164));
    expect(keys.size).toBe(1);
  });

  it('accepts a non-mobile number of the right length and marks it as not mobile', () => {
    const nonMobile = normalizePhone('041 2345678');
    expect(nonMobile.e164).toBe('+971412345678');
    expect(nonMobile.isMobile).toBe(false);
  });

  // UAE landlines are 8 digits after the country code and mobiles are 9. The
  // brand sets nationalNumberLength to 9 because the shop collects MOBILE
  // numbers (WhatsApp, delivery calls), so a landline is rejected on purpose.
  it('rejects an 8-digit UAE landline: the shop collects mobiles', () => {
    expect(normalizePhone('04 123 4567').e164).toBeNull();
    expect(normalizePhone('+971 4 123 4567').e164).toBeNull();
  });

  describe('numbers from other countries', () => {
    it.each([
      ['+44 7700 900123', '+447700900123'],
      ['0044 7700 900123', '+447700900123'],
      ['+1 (415) 555-2671', '+14155552671'],
      ['+966 50 123 4567', '+966501234567'],
    ])('keeps %s as %s', (input, expected) => {
      const phone = normalizePhone(input);
      expect(phone.e164).toBe(expected);
      expect(phone.national).toBeNull();
      expect(phone.isMobile).toBe(false);
    });

    it('does not mistake a foreign number for a local one, or the reverse', () => {
      // Written without a + or 00 a foreign number cannot be told from a national one: rejected.
      expect(normalizePhone('44 7700 900123').e164).toBeNull();
      // The brand's own code still takes the national path, so a UAE landline stays rejected.
      expect(normalizePhone('+971 4 123 4567').e164).toBeNull();
    });

    it('rejects an international number that is too short or too long to be one', () => {
      expect(normalizePhone('+44 123').e164).toBeNull();
      expect(normalizePhone('+44 1234 5678 9012 3456').e164).toBeNull();
    });
  });

  it('marks 5x numbers as mobile', () => {
    expect(normalizePhone('0521234567').isMobile).toBe(true);
  });

  it('produces a readable national form', () => {
    expect(normalizePhone('+971501234567').national).toBe('050 123 4567');
  });

  it.each([
    ['', 'empty'],
    ['   ', 'blank'],
    ['0300123', 'too short'],
    ['05012345678', 'too long'],
    ['abcdefghij', 'not digits'],
  ])('rejects %s (%s)', (input) => {
    expect(normalizePhone(input).e164).toBeNull();
    expect(isValidPhone(input)).toBe(false);
  });

  it('rejects null and undefined', () => {
    expect(normalizePhone(null).e164).toBeNull();
    expect(normalizePhone(undefined).e164).toBeNull();
  });
});

describe('normalizeEmail', () => {
  it('lower-cases and trims', () => {
    expect(normalizeEmail('  Ayesha@Example.COM ')).toBe('ayesha@example.com');
  });

  it('rejects values that are not addresses', () => {
    expect(normalizeEmail('not-an-email')).toBeNull();
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
  });
});
