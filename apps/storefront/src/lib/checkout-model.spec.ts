import {
  EMPTY_DELIVERY,
  NOTE_LIMIT,
  OUTSIDE,
  buildShippingAddress,
  composeNote,
  destinationCity,
  validateDelivery,
  type DeliveryForm,
} from './checkout-model';

const valid: DeliveryForm = {
  email: 'mariam@example.com',
  fullName: 'Mariam Al Hashimi',
  phone: '050 123 4567',
  emirate: 'Dubai',
  city: '',
  country: '',
  area: 'Emirates Hills',
  line1: 'Villa 12, Street 4',
};

describe('validateDelivery', () => {
  it('passes a complete UAE address', () => {
    expect(validateDelivery(valid)).toEqual({});
  });

  it('asks for every missing field and says what is wrong with a malformed one', () => {
    expect(Object.keys(validateDelivery(EMPTY_DELIVERY)).sort()).toEqual(['email', 'emirate', 'fullName', 'line1', 'phone']);
    expect(validateDelivery({ ...valid, email: 'nope' }).email).toBe('email');
    expect(validateDelivery({ ...valid, phone: '12345' }).phone).toBe('phone');
  });

  it('accepts a client abroad, with their own country code, and then needs a city and country', () => {
    const abroad = { ...valid, emirate: OUTSIDE, phone: '+44 7700 900123' };
    expect(validateDelivery(abroad)).toEqual({ city: 'required', country: 'required' });
    expect(validateDelivery({ ...abroad, city: 'London', country: 'United Kingdom' })).toEqual({});
  });

  it('does not ask for a city or country inside the UAE', () => {
    expect(validateDelivery({ ...valid, city: '', country: '' })).toEqual({});
  });
});

describe('destinationCity', () => {
  it('is the emirate inside the UAE and the typed city abroad', () => {
    expect(destinationCity(valid)).toBe('Dubai');
    expect(destinationCity({ ...valid, emirate: OUTSIDE, city: ' London ' })).toBe('London');
  });

  it('is unknown until something is chosen', () => {
    expect(destinationCity(EMPTY_DELIVERY)).toBeNull();
    expect(destinationCity({ ...valid, emirate: OUTSIDE, city: '' })).toBeNull();
  });
});

describe('buildShippingAddress', () => {
  it('maps a UAE address with the emirate as both city and province, and the phone in E.164', () => {
    expect(buildShippingAddress(valid)).toEqual({
      fullName: 'Mariam Al Hashimi',
      phone: '+971501234567',
      line1: 'Villa 12, Street 4',
      line2: 'Emirates Hills',
      city: 'Dubai',
      province: 'Dubai',
    });
  });

  it('carries the country in the province for an address abroad, and omits an empty second line', () => {
    expect(
      buildShippingAddress({ ...valid, emirate: OUTSIDE, phone: '+44 7700 900123', city: 'London', country: 'United Kingdom', area: '' }),
    ).toEqual({
      fullName: 'Mariam Al Hashimi',
      phone: '+447700900123',
      line1: 'Villa 12, Street 4',
      city: 'London',
      province: 'United Kingdom',
    });
  });

  it('refuses to build from a form that is not valid', () => {
    expect(buildShippingAddress({ ...valid, phone: 'abc' })).toBeNull();
    expect(buildShippingAddress(EMPTY_DELIVERY)).toBeNull();
  });
});

describe('composeNote', () => {
  it('labels each part and leaves out what is empty', () => {
    expect(composeNote({ delivery: 'White-glove delivery', presentation: 'The ROYA box', giftNote: ' With love ' })).toBe(
      'Delivery: White-glove delivery\nPresentation: The ROYA box\nNote for the box: With love',
    );
    expect(composeNote({})).toBe('');
  });

  it('never exceeds what the order can hold, and keeps the choices before the customer’s own words', () => {
    const note = composeNote({ delivery: 'Collect at the atelier', remarks: 'x'.repeat(2000) });
    expect(note.length).toBeLessThanOrEqual(NOTE_LIMIT);
    expect(note.startsWith('Delivery: Collect at the atelier')).toBe(true);
  });
});
