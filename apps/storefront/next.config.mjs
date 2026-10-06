import createNextIntlPlugin from 'next-intl/plugin';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const workspaceRoot = path.join(fileURLToPath(new URL('.', import.meta.url)), '../..');

/**
 * The API, as the Next server reaches it. The browser never talks to this
 * address: it calls the storefront's own /api/v1, which is rewritten to it
 * below. One origin means the cart and refresh cookies are first-party (Safari
 * drops them across registrable domains), no CORS allowlist to keep in step,
 * and the API's address is not baked into the client bundle.
 */
const API_INTERNAL_URL = process.env.API_INTERNAL_URL || 'http://localhost:3001/api/v1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for the production image.
  output: 'standalone',
  // Trace dependencies from the pnpm workspace root so @newax/shared's files are included.
  outputFileTracingRoot: workspaceRoot,
  // The shared package is built to CommonJS for the API, which a browser bundle cannot tree-shake: every
  // client component would carry the whole package. The storefront reads its TypeScript source instead
  // (aliased below), so only what a page imports is shipped. `externalDir` lets Next compile it.
  transpilePackages: ['@newax/shared'],
  experimental: { externalDir: true },
  webpack(config) {
    config.resolve.alias['@newax/shared$'] = path.join(workspaceRoot, 'packages/shared/src/index.ts');
    return config;
  },
  poweredByHeader: false,
  images: {
    // Catalogue photographs are pre-sized JPEGs under /media and the API's own uploads.
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3001' },
      { protocol: 'http', hostname: '127.0.0.1', port: '3001' },
    ],
  },
  async redirects() {
    // The API's emails (abandoned-cart reminders) link to /cart; the design calls it the bag.
    return [{ source: '/:locale/cart', destination: '/:locale/bag', permanent: true }];
  },
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${API_INTERNAL_URL}/:path*` }];
  },
  async headers() {
    return [
      {
        // Films and photographs never change under the same name.
        source: '/media/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
