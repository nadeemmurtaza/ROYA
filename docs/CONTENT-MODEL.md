# Content model

How a ROYA piece is stored, and what the storefront reads from it. The engine stores a product generically; these are the conventions on top. They live in code in `apps/api/prisma/roya-data.ts` (what the seed writes) and `apps/storefront/src/lib/product-model.ts` (what the storefront reads), and each side has tests.

## A piece

| Field              | Convention                                                                                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`             | `STITCHED` for every sellable piece. The engine's default browse lists `STITCHED`, so a `GOODS` product is hidden from the collection (the couture trunk uses that on purpose).                             |
| `tags`             | `bespoke` = a commission (deposit, made to measure). `accessory` = one size. No tag = ready-to-wear.                                                                                                        |
| `category`         | `bridal`, `evening`, `accessories`. Names are translated rows.                                                                                                                                              |
| `description`      | the intro paragraph, then optional `## Title` sections. The storefront turns each section into an accordion drawer, in order.                                                                               |
| `careInstructions` | the last drawer, "Delivery, fittings & care".                                                                                                                                                               |
| `metaDescription`  | the one-line blurb on cards, also the SEO description.                                                                                                                                                      |
| `basePrice`        | the **whole** price, in fils.                                                                                                                                                                               |
| images             | `order` 0 is the cover. A URL ending `.mp4` is a **film**: the storefront finds `/media/video/<name>.webm` and `/media/posters/<name>.jpg` beside it by name. Photographs sort before films in the gallery. |
| translations       | one `ProductTranslation` row per language; `ProductImageTranslation` for alt text.                                                                                                                          |

## Variants

- `size` and `color` (+ `colorHex`). **Made to measure** is the variant whose size is `MTM`; atelier sizes are `FR 34`…`FR 44`; an accessory has `One size`.
- A **commission is sold as its deposit**: every variant carries `priceOverride` = 50% of `basePrice` (`BRAND.commerce.bespokeDepositPercent`). The bag shows the deposit and "of AED 28,500"; the balance is due at the final fitting.
- Stock is seeded at 0: ROYA makes to order. The storefront never disables a variant for being out of stock, and ignores the cart's stock warnings.

## Collections

`signature` (the Home strip, in order) and `new` (the Home shelf). A collection is a curated list; the admin edits it, the Home page re-reads it within a minute.

## The couture trunk

`couture-trunk` (`GOODS`, AED 1,200) is the paid "presentation" option in the bag. Choosing it adds a line to the cart, so the total, VAT and invoice are right with no special case. The slug is `BRAND.storefront.featured.presentationTrunk`. If the product is absent the option simply is not offered.

## What the order note carries

The order has no field for how the client chose to receive it, so the storefront writes them into `customerNote` (English, for staff): `Delivery: white glove`, `Presentation: The ROYA box`, `Note for the box: …`, `Remarks: …`.
