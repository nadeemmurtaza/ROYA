# Working in this repository

House of ROYA: a standalone couture storefront on a commerce engine delivered from the Blueprint. Read [`docs/ENGINE-FORKS.md`](docs/ENGINE-FORKS.md) before touching `apps/api` or `packages/shared`.

## Where things live

| Looking for                                       | Open                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| The storefront                                    | `apps/storefront` (Next.js 15, next-intl, no Tailwind)                  |
| The atelier desk (staff: orders, payments)        | `apps/storefront/src/components/desk`, rules in `src/lib/desk-model.ts` |
| The engine                                        | `apps/api` (NestJS + Prisma + Postgres), `packages/shared`              |
| The design, as imported                           | `design/` (read-only; the code is the implementation)                   |
| Every colour, font, width, currency, handle, slug | `packages/shared/src/brand.ts`                                          |
| UI copy                                           | `apps/storefront/messages/{en,ar}.json`                                 |
| What is undecided                                 | `docs/OPEN-QUESTIONS.md`                                                |

## Rules

1. **No hardcoding.** A colour, font, width, currency, dial code, handle, product slug or business number comes from `brand.ts`. A stylesheet holds no colour literal (a spec enforces it); use the custom properties. Copy goes in the message files, never in JSX.
2. **Two languages, one codebase.** Every message key exists in both languages (a spec enforces it). Use logical CSS properties (`inline-start`, `padding-inline`), never `left`/`right`, so Arabic mirrors for free. Prices are Latin digits inside `<bdi dir="ltr">`.
3. **The API prices, the storefront asks.** Never compute a total, a deposit or VAT to charge on the client; the cart and order responses are the truth. The client may _display_ (`formatPrice`, `vatIncluded`).
4. **The storefront survives the API being down.** Catalogue reads are server-side and cached for a minute; a read that fails renders an honest empty state, never an error page. Cart, checkout and account are client-side and show their own error states.
5. **Guests can buy.** Nothing between the first product and a placed order may require an account.
6. **Reduced motion keeps the information.** Anything animated has a still equivalent under `prefers-reduced-motion`; films are not loaded then.
7. **An engine edit is a fork.** If you must change `apps/api` or `packages/shared`, add a test that fails without it and a row to `docs/ENGINE-FORKS.md`.
8. **Never delete data, files or branches without the owner naming them.** Prefer deactivating to deleting (the inherited shipping zones are a worked example).

## Before you commit

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter @newax/storefront build          # the production build catches what dev does not
node apps/storefront/e2e/sweep.mjs             # overflow at 280…1536px, both themes, both languages (needs the stack running)
```

A change to what a person sees is looked at in a browser at 280px and 1280px in English and Arabic, not judged from the code. Say what you saw.

## Conventions

- Server components fetch the catalogue (`src/lib/catalog.ts`); client components own the bag, checkout and account (`src/providers`, `src/components`).
- Pure rules (validation, parsing, note composition) live in `src/lib/*-model.ts` with a spec beside them; components stay thin.
- The browser calls `/api/v1/*` on its own origin, which `next.config.mjs` rewrites to the API (`API_INTERNAL_URL`).
