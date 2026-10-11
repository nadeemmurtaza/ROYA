# Deploying on Cloudflare

Three Workers, one per app. Each has its own `workers.dev` address; a custom domain is a later step (see Not done).

| Worker            | Source            | How it runs                                                           |
| ----------------- | ----------------- | --------------------------------------------------------------------- |
| `roya-api`        | `apps/api-edge`   | A Worker in front of one container built from `apps/api/Dockerfile`   |
| `roya-storefront` | `apps/storefront` | Next.js through the OpenNext adapter                                  |
| `roya-admin`      | `apps/admin`      | Next.js through the OpenNext adapter, pages and assets under `/admin` |

The storefront and the back office each proxy `/api/v1/*` to the API Worker on the server, so the browser still calls its own origin: cookies stay first-party and no CORS list is needed.

## What was checked, and what was not

Checked here, on Cloudflare's own runtime (workerd, through `wrangler dev`) against a local API:

- Both Next apps build with the adapter. The storefront's Node.js middleware (locale redirect `/` to `/en`) works, Arabic renders `dir="rtl"`, and the `/api/v1` proxy reaches the API.
- A full purchase in English and in Arabic through the Worker places an order. The back office signs in through its real form and loads 11 screens with scripts and styles served.
- The storefront renders per request (`Cache-Control: no-store`), so a build made while the API is down cannot leave stale pages behind.
- `apps/api-edge` typechecks and Wrangler accepts its config (the Worker bundles, the Durable Object binding is found, the container points at the Dockerfile).
- A clean checkout with no `.env` builds all three apps (`turbo.json` runs `prisma generate` first).

**Not checked, because it needs your Cloudflare account:** the container image build and start on Cloudflare, the `Cloudflare` workflow end to end, `wrangler secret bulk`, the smoke test, and the Containers feature on your plan. Expect to fix something on the first run, the way the Database workflow needed one retry.

## One-time setup

1. Put the account on **Workers Paid** (US$5 a month minimum). Containers are generally available on that plan only.
2. Create an API token (Cloudflare dashboard, My Profile, API Tokens) from the "Edit Cloudflare Workers" template and add the permission to edit Containers. Copy the **Account ID** from Workers & Pages, Overview.
3. In Workers & Pages, Overview, note your **workers.dev subdomain**: the part before `.workers.dev`.
4. In GitHub, Settings, Secrets and variables, Actions, add **repository secrets**:

   | Secret                   | Value                                                                                                 |
   | ------------------------ | ----------------------------------------------------------------------------------------------------- |
   | `CLOUDFLARE_API_TOKEN`   | the token from step 2                                                                                 |
   | `CLOUDFLARE_ACCOUNT_ID`  | the account ID                                                                                        |
   | `API_DATABASE_URL`       | the Supabase **transaction pooler** (port 6543) with `&pgbouncer=true&connection_limit=1&schema=roya` |
   | `API_REDIS_URL`          | a hosted Redis, for example Upstash (`rediss://…`); without it every sign-in answers 503              |
   | `API_JWT_ACCESS_SECRET`  | `openssl rand -base64 48`                                                                             |
   | `API_JWT_REFRESH_SECRET` | `openssl rand -base64 48`                                                                             |
   | `API_APP_ENCRYPTION_KEY` | exactly 32 characters: `openssl rand -base64 24 \| head -c 32`                                        |

   and one repository **variable** (the Variables tab, not Secrets): `CLOUDFLARE_WORKERS_SUBDOMAIN`.

5. Run the **Database** workflow first if the database is not migrated (README, Database setup).
6. Actions, Cloudflare, Run workflow. It checks the secrets, deploys the three Workers in order, and fails unless the API, the storefront and the back office each answer 200.

## Decisions and their numbers

| Parameter                        | Value                      | Why                                                                                                                 | If it is wrong                                                               |
| -------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| API containers (`max_instances`) | 1                          | The API runs 23 scheduled jobs and the event dispatcher inside its process; a second copy would run each job twice. | One container is a single point; it restarts on the next request.            |
| Container size (`instance_type`) | `basic` (1 GiB)            | Nest and Prisma idle well under it. Memory is the billed quantity, so smaller costs less.                           | If the container restarts for memory, set `standard-1` (4 GiB) and redeploy. |
| `sleepAfter`                     | 15 minutes                 | Longer than the keep-alive interval, so the container never sleeps while the trigger runs.                          | A sleeping container pauses the API's scheduled jobs until its next request. |
| Keep-alive cron                  | every 5 minutes            | Wakes the container so its jobs keep running. Remove the `triggers` block to let it sleep and save money.           | Jobs run late or not at all while it sleeps.                                 |
| Workflow timeout                 | 45 minutes                 | Install, three builds and an image push. It bounds a hung step, not a normal run.                                   | A slow image push fails the run; run it again.                               |
| Smoke test                       | 30 tries, 10 seconds apart | The container needs time to start from cold.                                                                        | The run fails and names the address that did not answer.                     |

Other choices:

- **Next 15.5.27.** The adapter requires `>=15.5.27 <16`; the apps were on 15.5.23. This is a patch update inside the same minor, applied to both apps.
- **No cache bucket.** The adapter's default cache stores nothing, and the storefront rendered live in testing. An R2 cache would let pages be cached for a minute again; it is not set up.
- **Admin assets.** The back office serves its files under `/admin/_next`. The adapter only writes `/_next`, so `apps/admin/scripts/cf-assets.mjs` copies them under the prefix after the build. Without it every script and style returns a 404 page.

## Not done

- **A custom domain.** Each Worker answers on its own `workers.dev` address. To serve one domain, add Worker routes `/admin/*` to `roya-admin`, `/api/*` to `roya-api` and `/*` to `roya-storefront` in a zone you own, then set the three addresses the workflow computes from the subdomain.
- **File storage.** The workflow sets `STORAGE_DRIVER=local`, which writes to the container's own disk, and a restart erases it. Payment receipts and product images are lost. Before real use, set the API to S3 or R2 (`STORAGE_DRIVER=s3` and the `S3_*` values).
- **Card payments, email and WhatsApp.** Bank transfer only; notifications log instead of sending.

## When something fails

| Symptom                                                                           | Cause and fix                                                                                                                            |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Build: `Property 'notificationPreference' does not exist on type 'PrismaService'` | The Prisma client is generated code and was never generated. Fixed in `turbo.json` (a `db:generate` task); the branch needs that commit. |
| Every sign-in answers 503                                                         | The API cannot reach Redis. Check `API_REDIS_URL`.                                                                                       |
| The back office loads but its dashboard shows errors, or the shop is empty        | The API's `MODULES` list is missing entries. The workflow reads it from `.env.example`; unset, only always-on modules load.              |
| The back office has no styles and the console shows `text/html` for scripts       | `scripts/cf-assets.mjs` did not run; build with `pnpm --filter @newax/admin cf:build`, not `next build`.                                 |
| `Docker CLI is needed` on your own computer                                       | Wrangler builds the container image locally. The workflow runs on GitHub, which has Docker.                                              |
