# Open questions

What the build could not decide, or was not given. Each item says what is affected, who can answer, and where the answer goes. Nothing below is invented in the code: where the design left a fact open, the storefront leaves it out (or shows the engine's honest empty state) until it is supplied.

## 1. Facts to supply (the design printed them as `[PLACEHOLDERS]`)

| Fact                                       | Where it goes                                                                  | Until then                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Domain and public URL                      | `BRAND.identity.domain/url`; `NEXT_PUBLIC_SITE_URL`, `STOREFRONT_URL` (`.env`) | `roya.example`                                                                  |
| Contact email, phone, WhatsApp number      | `BRAND.contact`                                                                | placeholder numbers; the WhatsApp links point at them                           |
| Atelier address and city                   | `BRAND.contact.address/city`                                                   | left out of the page (`isFilled` hides a bracketed value)                       |
| Designer's name                            | not stored yet; the design prints `[Designer name]`                            | the copy says "the designer"                                                    |
| TRN and trade licence                      | `BRAND.legal` (printed on invoices)                                            | `[TRN]` — **required on a UAE tax invoice**                                     |
| Bank name, account title, number, IBAN     | `BRAND.banking`, mirrored in the bank-transfer provider settings               | confirmation page says "bank details are on their way by email"                 |
| Lead time for a commission / ready-to-wear | `BRAND.commerce.stitchingTurnaroundTime` / `standardDeliveryTime`              | the "Ready in" fact is left out of the product page                             |
| Delivery ETA, white-glove                  | shipping method `etaMinDays/etaMaxDays` (admin → shipping)                     | seeded as 1–2 days, a placeholder                                               |
| Instagram / TikTok handles                 | `BRAND.socials`                                                                | taken from the design (`houseofroya.ae`, `royawear.ae`) — confirm they are real |
| Sending domain, SMTP, WhatsApp gateway     | `.env` (`MAIL_FROM`, `SMTP_*`, `WHATSAPP_*`)                                   | notifications are logged, not sent                                              |
| Stock                                      | back office                                                                    | every piece is seeded at stock 0 = made to order                                |

## 2. Decisions that change the build

1. **Card and Apple Pay.** The design shows a card form and Apple Pay. The engine has no UAE card provider (the Pakistani gateways in the codebase are off and must stay off). Today only **bank transfer** can settle an order. Choose a gateway (Stripe UAE, Checkout.com, Network International, Telr, PayTabs; Tabby/Tamara if buy-now-pay-later matters) and one provider adapter is added behind `payment-provider.ts`. The storefront already follows a hosted gateway's `redirectUrl` and will list any provider the API enables. The design's on-page card form is deliberately not built: card numbers should never touch ROYA's pages. Until then the footer says "Payment by bank transfer" (`footer.payments` in both message files) rather than the design's card and Apple Pay marks; change that line with the adapter.
2. **Collecting the balance on a commission.** A commission is sold as its 50% deposit (a variant priced at the deposit; `basePrice` stays the whole). The balance is collected by hand at the final fitting. An online instalment plan exists only in the point-of-sale part of the engine.
3. **A commission tracker.** The design's private-client dashboard shows a five-stage progress track, atelier films of _your_ gown, and appointments. The engine has no model for any of these, so the dashboard shows what is real (orders and their status, measurements, wishlist, addresses) and links to booking. Building it is a new module (stages, a film per stage, appointments, a notification when a stage changes). It is the largest functional gap against the design.
4. **The general ledger, and the back office's language.** The **atelier desk** (orders, bank-transfer receipts, consultation requests) and the **back office** (`apps/admin`: catalogue, stock, suppliers, purchase orders, production, expenses, margins, reports) are built. Two decisions remain. (a) `accounting` is shipped but **off**: switching it on gives profit & loss, cash flow and fiscal periods, and starts an immutable double-entry ledger that every order, payment and bill posts to, so someone should decide when ROYA's books begin and who closes the periods. (b) The back office is English with Arabic content fields; say whether the team needs the screens themselves in Arabic.
5. **Sign-in by phone code, Apple and Google.** Not built; password sign-in, reset and email verification are.
6. **Delivery time slots.** The design's "preferred arrival" has no engine support; a customer's remarks go into the order note.

## 3. Wording that must be reviewed

- **Arabic.** The Home page Arabic is the design's own. Everything else (collection, product, bag, checkout, account, emails, help pages) is a **draft**, written to match the design's feminine address, and needs a native reader before launch. See [LOCALES.md](./LOCALES.md).
- **Legal pages** (`/help/privacy`, `/help/terms`) are short factual summaries of what the shop does, not legal text. Have counsel replace them. A UAE shop also needs a cookie/consent position under the PDPL.
- **Promises the system does not enforce.** The copy says the designer will message "within the hour", that a bank-transfer slot is "held for 72 hours", and that a consultation follows "within 7 days". Someone has to honour these, or the sentences in `messages/*.json` should change.
- **Hem adjustment, fittings "included until it is perfect"** are taken from the design; confirm they are policy.

## 4. Known approximations

- GBP and EUR display rates are the design's and have **no live source**; they drift. USD and SAR are derived from the dirham peg. Charges are always AED.
- The address model has no country field: abroad, the country is stored in `province`.
- Variant (shade) names are free text in English; the storefront translates the four ROYA uses (`shades.*` in the messages).
- The wishlist API returns English product names; the dashboard re-reads names in the visitor's language from the catalogue.
- Landlines are rejected on purpose (the shop collects mobiles); numbers from other countries are accepted in E.164.
- Arabic search matches whole words only (Postgres text search config `simple`, no stemming). Postgres 16 ships an `arabic` config that `search.service.ts` does not use yet; using it means re-indexing the stored search vectors.
