# House of ROYA

Couture bridal and evening wear, UAE. A bilingual (English / Arabic, right-to-left) storefront with dark and light themes, on a commerce engine that already knows about orders, deposits, measurements, VAT and the CRM.

```
apps/storefront   Next.js 15 storefront (this is the product people see) and the bilingual atelier desk
apps/admin        Next.js 15 back office, English: catalogue, stock, suppliers, production, finance (from the Blueprint)
apps/api          NestJS + Prisma + Postgres commerce engine (delivered from the Blueprint, adapted)
packages/shared   brand.ts (the one rebrand file), types, pricing, phone, HTTP client
packages/config   shared tooling config
design/           the claude.ai design canvas as imported, plus the README that says how to read it
docs/             OPEN-QUESTIONS, CONTENT-MODEL, LOCALES, design-tokens, ENGINE-FORKS
```

## What a visitor can do

Browse the collection (filter, sort, paginate), open a piece (gallery with atelier films, shades, made-to-measure or atelier sizes), search live, keep a bag with a presentation choice and a handwritten note, check out as a guest in three steps (delivery priced by the engine, payment, review), pay by bank transfer and upload the receipt, find an order again with its number and mobile, request a consultation (atelier, home, video), sign in / register / reset a password, and keep an account with orders, measurements, a wishlist and addresses. The bespoke "Mehr" is sold as its 50% deposit. Once it is being made, the client follows it stage by stage on their account and asks for fittings there.

## What the atelier can do

Staff sign in on the same account page and land on the **atelier desk** (`/en/desk`, `/ar/desk`): every order with search and a status filter, one order with its next step (confirm, start work, finish, hand to a courier with a tracking number, deliver; cancel or return behind a confirmation), the bank-transfer receipts waiting to be checked against the statement, and the consultation requests with one tap to WhatsApp, call or email. The desk shows only what a person's permissions allow; the engine enforces them on every call. **Commissions** is the fourth section: it follows each bespoke gown from consultation to the final fitting, and what the atelier records there is what the client reads on their account. The rest of the daily work, products and prices, stock, suppliers and purchase orders, recipes and production runs, expenses, margins and reports, is in the **back office** (`apps/admin`, `/admin`, English): the same sign-in, the same permissions, and it shows only the modules this deployment switches on. See [ENGINE-FORKS](docs/ENGINE-FORKS.md) for what it is and how it differs from the Blueprint's.

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
NEXT_PUBLIC_SITE_URL=http://localhost:3000 pnpm --filter @newax/admin dev   # back office on :3002 → /admin
```

Demo accounts (development only): `admin@roya.example` / `admin12345`, `staff@roya.example` / `staff12345`, `mariam@example.com` / `customer12345`. In production the seed requires `SEED_ADMIN_PASSWORD` and creates no demo accounts.

## Check it

```bash
pnpm lint && pnpm typecheck && pnpm test           # engine + storefront
pnpm --filter @newax/storefront build              # production build
pnpm --filter @newax/admin build                   # the back office's production build
node apps/storefront/e2e/purchase.mjs en           # a real purchase in a real browser (stack running)
node apps/storefront/e2e/desk.mjs                  # the atelier desk: place an order, confirm the payment, ship it, in a real browser
node apps/storefront/e2e/sweep.mjs                 # every page × 7 widths × 2 themes × 2 languages, fails on overflow
```

The engine's DB-backed specs need the migrated, seeded database from the steps above.

## Deploy

Three images from the repo root: `docker build -f apps/api/Dockerfile .` `docker build -f apps/storefront/Dockerfile --build-arg NEXT_PUBLIC_SITE_URL=https://… .` and `docker build -f apps/admin/Dockerfile --build-arg NEXT_PUBLIC_SITE_URL=https://… .`. The storefront and the back office each need `API_INTERNAL_URL` (how it reaches the API) at run time; the API needs the secrets in `.env.example` marked CHANGE-ME (it refuses to start in production on the development defaults), `STOREFRONT_URL` (links in emails), a real `PAYMENT_PROVIDERS`, and SMTP/WhatsApp credentials if notifications should be sent. Run `pnpm db:deploy` on every release; never `migrate diff` against a real database.

### Database setup (Supabase, from GitHub)

[`.github/workflows/database.yml`](.github/workflows/database.yml) applies the migrations, and optionally creates the first admin, from GitHub's network, for a database a development sandbox cannot reach. It runs only when started by hand.

1. In Supabase, copy the **session pooler** connection string (port 5432) and add `schema=roya`: `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require&schema=roya`.
2. In GitHub, Settings → Secrets and variables → Actions, add `DATABASE_URL_MIGRATE` with that string. For the first admin also add `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (at least 12 characters; the workflow refuses a shorter one).
3. The workflow file must be on the default branch to appear. Actions → Database → Run workflow, ticking "Also create the first admin" the first time. A final `migrate status` fails the run unless the database is up to date.

- **Why `schema=roya`.** Supabase serves the `public` schema through its REST API with a public anon key, so tables Prisma creates there are readable and writable without a login. A schema of our own is not exposed. All 117 migrations, pgvector, the seed and an admin sign-in were run against a non-public schema before this was written; if you keep `public`, turn the Data API off instead (the workflow warns when `schema=` is missing).
- **Two URLs.** Migrations need a session connection, so the workflow refuses the transaction pooler (port 6543, `pgbouncer=true`). The running API wants the opposite: its `DATABASE_URL` is the transaction pooler with `pgbouncer=true&connection_limit=1` and the same `schema=roya`, so a function does not exhaust Postgres connections.
- **The API needs Redis.** Without `REDIS_URL` reachable, its sign-in rate limiter fails closed and every login answers 503, the admin's included.
- **Running again is safe.** `migrate deploy` skips what is applied; the seed asserts a user's role and never resets an existing password, so changing the secret later does not change an admin who already exists. A new `SEED_ADMIN_EMAIL` creates a second admin.
- **If a migration fails**, Prisma records it as failed and refuses further deploys. Fix the cause, then from a machine that reaches the database run `pnpm --filter @newax/api exec prisma migrate resolve --rolled-back <migration name>` (or `--applied` if you finished it by hand) and run the workflow again. The workflow never cancels a run in progress (a half-applied migration is the worst state), so a second run waits for the first.
- **Who can run it.** Anyone with write access to the repository can start this workflow. Logs mask the secrets, but keep write access to people who may change your database.

### On Vercel

One Vercel project runs the three apps as services of the root [`vercel.json`](vercel.json): `storefront` is public on `/`, `admin` on `/admin`, `api` on `/api`, all on one domain, so the browser still calls its own `/api/v1` and the cookies stay first-party. The storefront's server components reach the API through a service binding, which injects `API_SERVICE_URL` at run time (never set it by hand). The back office makes no server-side API call, so it has no binding, and its framework assets are served under `/admin/_next` so they cannot collide with the storefront's `/_next`. A service cannot hold Edge Function output, so the storefront's middleware declares `runtime: 'nodejs'` (Next's default is the Edge, which fails the deploy). `pnpm lint` runs `scripts/check-vercel-config.mjs`, which keeps the file consistent with itself and refuses any Edge runtime in a service. `vercel dev` runs all three locally; the per-app commands above still work and need no Vercel at all.

Set per environment in the project: everything the API needs (see Deploy above) including a Postgres with pgvector, a Redis and `STORAGE_DRIVER=s3` (a function has no durable disk), and `NEXT_PUBLIC_SITE_URL` plus `STOREFRONT_URL` for the public origin. The API's scheduled jobs and its outbox dispatcher run in-process, which a function does not keep alive: see item 7 in [`docs/OPEN-QUESTIONS.md`](docs/OPEN-QUESTIONS.md) before relying on this for production.

### On Cloudflare

Three Workers: the storefront and the back office through the OpenNext adapter (`apps/storefront`, `apps/admin`), and the API as a container behind a Worker (`apps/api-edge`, built from `apps/api/Dockerfile`). [`.github/workflows/cloudflare.yml`](.github/workflows/cloudflare.yml) deploys all three from GitHub, so the Cloudflare token lives in a repository secret. Secrets, token permissions, the numbers chosen, what was verified on Cloudflare's runtime and what only a first deploy can confirm are in [`docs/CLOUDFLARE.md`](docs/CLOUDFLARE.md).

Before launch work through [`docs/OPEN-QUESTIONS.md`](docs/OPEN-QUESTIONS.md): the TRN, bank details, domain, Arabic review and the choice of a card gateway are not decided by code.

## Upgrading the engine

`apps/api` and `packages/shared` came from the Blueprint (`scripts/sync-client.mjs`). A sync overwrites them; [`docs/ENGINE-FORKS.md`](docs/ENGINE-FORKS.md) lists every ROYA edit and the test that guards it. Land the generic fixes upstream so each fork disappears.
