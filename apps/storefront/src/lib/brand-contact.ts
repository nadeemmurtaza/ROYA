import { BRAND } from '@newax/shared';

/**
 * Contact facts, as the brand file holds them.
 *
 * Until the atelier supplies its real address, number and handles, brand.ts
 * carries bracketed placeholders ("[ATELIER ADDRESS]"). The design shows those
 * on the page; a live shop must not. `isFilled` lets a page leave a placeholder
 * out until the real value is in (docs/OPEN-QUESTIONS.md lists each one).
 */
export const isFilled = (value: string): boolean => value.trim() !== '' && !/^\[.*\]$/.test(value.trim());

/** "@houseofroya.ae" from "https://instagram.com/houseofroya.ae". */
export function handleOf(url: string): string {
  const last = url.replace(/\/+$/, '').split('/').pop() ?? '';
  return last.startsWith('@') ? last : `@${last}`;
}

export const instagramHandle = handleOf(BRAND.socials.instagram);
export const tiktokHandle = handleOf(BRAND.socials.tiktok);

/** A wa.me link: digits only, no plus. */
export const whatsappUrl = `https://wa.me/${BRAND.contact.whatsapp.replace(/\D/g, '')}`;
