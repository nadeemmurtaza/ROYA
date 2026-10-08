import { BRAND, SECOND_LOCALE } from '@newax/shared';

/**
 * The brand's second language, named in English for a form label or column
 * header ("Arabic"). The back office is English-only, but what staff type into
 * a translation field is not, and which language that is belongs to the brand.
 */
export const SECOND_LANGUAGE_NAME: string = BRAND.locale.localeNames[SECOND_LOCALE];
