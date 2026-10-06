import { BRAND, normalizePhone } from '@newax/shared';

/**
 * The delivery form, its rules, and how it becomes what the API takes.
 *
 * Kept free of React so every rule is testable. The API validates again
 * (the client is never trusted); these rules exist so a person finds out what
 * is wrong next to the field, before a round trip.
 */
export const OUTSIDE = 'outside';
export const EMIRATES: readonly string[] = BRAND.locale.regions;

export interface DeliveryForm {
  email: string;
  fullName: string;
  phone: string;
  /** One of EMIRATES, OUTSIDE, or '' before a choice. */
  emirate: string;
  /** Only for a destination outside the UAE. */
  city: string;
  country: string;
  /** Area or community. */
  area: string;
  /** Villa, building or residence. */
  line1: string;
}

export const EMPTY_DELIVERY: DeliveryForm = {
  email: '',
  fullName: '',
  phone: '',
  emirate: '',
  city: '',
  country: '',
  area: '',
  line1: '',
};

export type DeliveryField = keyof DeliveryForm;
export type DeliveryProblem = 'required' | 'email' | 'phone';
export type DeliveryErrors = Partial<Record<DeliveryField, DeliveryProblem>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isAbroad(form: Pick<DeliveryForm, 'emirate'>): boolean {
  return form.emirate === OUTSIDE;
}

export function validateDelivery(form: DeliveryForm): DeliveryErrors {
  const errors: DeliveryErrors = {};
  const blank = (value: string) => value.trim() === '';

  if (blank(form.email)) errors.email = 'required';
  else if (!EMAIL.test(form.email.trim())) errors.email = 'email';

  if (blank(form.fullName)) errors.fullName = 'required';

  if (blank(form.phone)) errors.phone = 'required';
  else if (normalizePhone(form.phone).e164 === null) errors.phone = 'phone';

  if (blank(form.emirate)) errors.emirate = 'required';
  if (isAbroad(form)) {
    if (blank(form.city)) errors.city = 'required';
    if (blank(form.country)) errors.country = 'required';
  }
  if (blank(form.line1)) errors.line1 = 'required';
  return errors;
}

/** The city the shipping zone is chosen from: the emirate, or the city abroad. Null until it is known. */
export function destinationCity(form: DeliveryForm): string | null {
  const city = isAbroad(form) ? form.city.trim() : form.emirate.trim();
  return city === '' || city === OUTSIDE ? null : city;
}

export interface ShippingAddressBody {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  province: string;
}

/**
 * The engine's address has a city (which picks the zone) and a province. In the
 * UAE both are the emirate; abroad the province carries the country, since the
 * address has no country field of its own.
 */
export function buildShippingAddress(form: DeliveryForm): ShippingAddressBody | null {
  const city = destinationCity(form);
  const phone = normalizePhone(form.phone).e164;
  if (!city || !phone) return null;
  return {
    fullName: form.fullName.trim(),
    phone,
    line1: form.line1.trim(),
    ...(form.area.trim() ? { line2: form.area.trim() } : {}),
    city,
    province: isAbroad(form) ? form.country.trim() : form.emirate.trim(),
  };
}

/** The order's note field holds 500 characters. */
export const NOTE_LIMIT = 500;

/**
 * Everything the atelier should know that the order has no field for: how the
 * customer chose to receive it, how to present it, a handwritten note for the
 * box, and anything else. Lines are labelled in the shop's language (English),
 * because staff read them. If it all cannot fit, the customer's own words are cut
 * last: the choices come first.
 */
export function composeNote(parts: {
  delivery?: string;
  presentation?: string;
  giftNote?: string;
  remarks?: string;
}): string {
  const lines = [
    parts.delivery ? `Delivery: ${parts.delivery}` : '',
    parts.presentation ? `Presentation: ${parts.presentation}` : '',
    parts.giftNote?.trim() ? `Note for the box: ${parts.giftNote.trim()}` : '',
    parts.remarks?.trim() ? `Remarks: ${parts.remarks.trim()}` : '',
  ].filter(Boolean);
  const note = lines.join('\n');
  return note.length <= NOTE_LIMIT ? note : `${note.slice(0, NOTE_LIMIT - 1)}…`;
}
