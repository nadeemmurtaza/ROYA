import { fileURLToPath } from 'node:url';
import path from 'node:path';

const workspaceRoot = path.join(fileURLToPath(new URL('.', import.meta.url)), '../..');

/**
 * The API, as the Next server reaches it. The browser never talks to this
 * address: it calls the back office's own /api/v1, which is rewritten to it
 * below. One origin means the session cookie is first-party and there is no
 * CORS allowlist to keep in step.
 */
const API_INTERNAL_URL = process.env.API_INTERNAL_URL || 'http://localhost:3001/api/v1';

/**
 * The 8 hand-built insight pages the report registry replaced, each now an
 * entry under `/admin/analytics/*`. A permanent redirect, not a deleted route,
 * so a bookmark made before the rebuild still lands somewhere real.
 */
const RETIRED_INSIGHT_PAGES = [
  { source: '/admin/insights', destination: '/admin/analytics' },
  { source: '/admin/orders/insights', destination: '/admin/analytics/orders/overview' },
  { source: '/admin/customers/insights', destination: '/admin/analytics/customers/overview' },
  { source: '/admin/workshop/insights', destination: '/admin/analytics/workshop/output' },
  { source: '/admin/inventory/insights', destination: '/admin/analytics/inventory/valuation' },
  { source: '/admin/products/insights', destination: '/admin/analytics/products/top-sellers' },
  { source: '/admin/finance/expenses/analytics', destination: '/admin/analytics/expenses/by-category' },
  { source: '/admin/purchase-orders/spend', destination: '/admin/analytics/purchasing/spend' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A build can be written elsewhere, so it does not trample a running dev server's cache.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Self-contained server bundle for the production image.
  output: 'standalone',
  // Trace dependencies from the pnpm workspace root so @newax/shared's files are included.
  outputFileTracingRoot: workspaceRoot,
  // The shared package is built to CommonJS for the API, which a browser bundle cannot tree-shake.
  // The back office reads its TypeScript source instead (aliased below), so a page ships only what it imports.
  transpilePackages: ['@newax/shared'],
  experimental: { externalDir: true },
  webpack(config) {
    config.resolve.alias['@newax/shared$'] = path.join(workspaceRoot, 'packages/shared/src/index.ts');
    return config;
  },
  poweredByHeader: false,
  images: {
    // Uploads served by the API's own files controller.
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3001' },
      { protocol: 'http', hostname: '127.0.0.1', port: '3001' },
    ],
  },
  async redirects() {
    return [
      { source: '/', destination: '/admin', permanent: false },
      ...RETIRED_INSIGHT_PAGES.map((route) => ({ ...route, permanent: true })),
    ];
  },
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${API_INTERNAL_URL}/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
