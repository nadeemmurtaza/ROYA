# Build context is the REPO ROOT (docker build -f apps/storefront/Dockerfile .):
# the pnpm workspace (packages/shared) has to be visible to install and build.

FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/storefront/package.json apps/storefront/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/storefront/node_modules ./apps/storefront/node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
# Public values are baked into the browser bundle at build time.
ARG NEXT_PUBLIC_API_URL=/api/v1
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @newax/shared build
RUN pnpm --filter @newax/storefront build

# next.config.mjs sets output: 'standalone', a self-contained server with only
# what it needs. The rewrite to the API reads API_INTERNAL_URL when it BOOTS
# (set it on the container), not at build.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nextjs && adduser --system --uid 1001 nextjs
COPY --from=build --chown=nextjs:nextjs /repo/apps/storefront/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /repo/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=build --chown=nextjs:nextjs /repo/apps/storefront/public ./apps/storefront/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/storefront/server.js"]
