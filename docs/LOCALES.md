# Languages

ROYA speaks **English** (default) and **Arabic** (right-to-left). The set is `BRAND.locale.locales`; routes are `/en/...` and `/ar/...`, both indexable, with `hreflang` alternates.

## How it works

- **URLs**: `next-intl` with `localePrefix: 'always'`. A visitor's language is the URL, never a cookie, so a page is shareable and cacheable in its language.
- **Direction**: `<html dir>` comes from `BRAND.locale.rtlLocales`. Stylesheets use logical properties (`inline-start`, `padding-inline`, …) so one stylesheet serves both; the few physical rules are commented.
- **Type**: Arabic swaps the serif for Amiri and the sans for IBM Plex Sans Arabic (`html[dir='rtl']` re-points `--font-serif` / `--font-sans`). Letter-spacing and uppercase are switched off in Arabic (they break joined letters).
- **Numerals and prices**: Latin digits in both languages, as the design's Arabic pages use. A price is wrapped in `<bdi dir="ltr">` so `AED 28,500` reads correctly inside Arabic text.
- **Catalogue copy** comes from the API in the requested `locale`; product, category and image-alt translations are rows in the database (`ProductTranslation`, …).
- **UI copy** is `apps/storefront/messages/{en,ar}.json`. A spec (`src/messages.spec.ts`) fails the build if a key or an ICU placeholder is missing from either language.
- **Staff-facing text** (the order note, CRM leads) is always English whatever language the customer used, because the atelier reads it.

## Status of the Arabic

| Area                                                                       | Source                                                        | Review                                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| Home page                                                                  | the design's own Arabic (`design/source/Main-v2-AR*.dc.html`) | as designed                                                          |
| Product copy in the seed                                                   | translated from the design's English                          | **draft**                                                            |
| Collection, product, bag, checkout, account, dashboard, consultation, help | written for this build, feminine address as in the design     | **draft: needs a native reader**                                     |
| Transactional emails (`apps/api/src/core/notifications/email/copy.ts`)     | written for this build, formal plural address                 | **draft**; also decide feminine singular vs plural to match the site |

## Adding a language

Add the code to `BRAND.locale.locales` (and `rtlLocales` if it reads right-to-left), add `messages/<code>.json`, translate the seed copy (`apps/api/prisma/roya-data.ts` is keyed `en`/`ar` and the seed refuses to run if the second locale is not Arabic: that check is the place to extend), and add an `intlTags` entry. The message-parity spec then tells you what is missing.
