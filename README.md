# House of ROYA

Couture bridal and evening wear, UAE. A bilingual (English / Arabic, right-to-left) storefront with dark and light themes, on a commerce engine that already knows about orders, deposits, measurements, VAT and the CRM.

```
apps/storefront   Next.js 15 storefront (this is the product people see)
apps/api          NestJS + Prisma + Postgres commerce engine (delivered from the Blueprint, adapted)
packages/shared   brand.ts (the one rebrand file), types, pricing, phone, HTTP client
packages/config   shared tooling config
design/           the claude.ai design canvas as imported, plus the README that says how to read it
docs/             OPEN-QUESTIONS, CONTENT-MODEL, LOCALES, design-tokens, ENGINE-FORKS
```

## What a visitor can do

Browse the collection (filter, sort, paginate), open a piece (gallery with atelier films, shades, made-to-measure or atelier sizes), search live, keep a bag with a presentation choice and a handwritten note, check out as a guest in three steps (delivery priced by the engine, payment, review), pay by bank transfer and upload the receipt, find an order again with its number and mobile, request a consultation (atelier, home, video), sign in / register / reset a password, and keep an account with orders, measurements, a wishlist and addresses. The bespoke "Mehr" is sold as its 50% deposit.

## What the atelier can do

Staff sign in on the same account page and land on the **atelier desk** (`/en/desk`, `/ar/desk`): every order with search and a status filter, one order with its next step (confirm, start work, finish, hand to a courier with a tracking number, deliver; cancel or return behind a confirmation), the bank-transfer receipts waiting to be checked against the statement, and the consultation requests with one tap to WhatsApp, call or email. The desk shows only what a person's permissions allow; the engine enforces them on every call. Catalogue editing is not built yet, see [OPEN-QUESTIONS](docs/OPEN-QUESTIONS.md).

## Run it

Needs Node 22, pnpm 10, Docker (Postgres with pgvector, Redis).

```bash
pnpm install
cp .env.example .env                 # defaults work locally
pnpm services:up                     # postgres, redis, minio
pnpm db:generate && pnpm db:deploy   # prisma client, migrations
pnpm db:seed                         # the catalogue, shipping, VAT; demo accounts (never in production)
pnpm --filter @newax/shared build
pnpm --filter @newax/api build && node apps/api/dist/main.js     # API on :3001
pnpm --filter @newax/storefront dev                              # storefront on :3000  → /en  /ar
```

Demo accounts (development only): `admin@roya.example` / `admin12345`, `staff@roya.example` / `staff12345`, `mariam@example.com` / `customer12345`. In production the seed requires `SEED_ADMIN_PASSWORD` and creates no demo accounts.

## Check it

```bash
pnpm lint && pnpm typecheck && pnpm test           # engine + storefront
pnpm --filter @newax/storefront build              # production build
node apps/storefront/e2e/purchase.mjs en           # a real purchase in a real browser (stack running)
node apps/storefront/e2e/desk.mjs                  # the atelier desk: place an order, confirm the payment, ship it, in a real browser
node apps/storefront/e2e/sweep.mjs                 # every page × 7 widths × 2 themes × 2 languages, fails on overflow
```

The engine's DB-backed specs need the migrated, seeded database from the steps above.

## Deploy

Two images from the repo root: `docker build -f apps/api/Dockerfile .` and `docker build -f apps/storefront/Dockerfile --build-arg NEXT_PUBLIC_SITE_URL=https://… .`. The storefront needs `API_INTERNAL_URL` (how it reaches the API) at run time; the API needs the secrets in `.env.example` marked CHANGE-ME (it refuses to start in production on the development defaults), `STOREFRONT_URL` (links in emails), a real `PAYMENT_PROVIDERS`, and SMTP/WhatsApp credentials if notifications should be sent. Run `pnpm db:deploy` on every release; never `migrate diff` against a real database.

Before launch work through [`docs/OPEN-QUESTIONS.md`](docs/OPEN-QUESTIONS.md): the TRN, bank details, domain, Arabic review and the choice of a card gateway are not decided by code.

## Upgrading the engine

`apps/api` and `packages/shared` came from the Blueprint (`scripts/sync-client.mjs`). A sync overwrites them; [`docs/ENGINE-FORKS.md`](docs/ENGINE-FORKS.md) lists every ROYA edit and the test that guards it. Land the generic fixes upstream so each fork disappears.
