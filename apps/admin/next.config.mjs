import { fileURLToPath } from 'url';
import path from 'path';

const workspaceRoot = path.join(fileURLToPath(new URL('.', import.meta.url)), '../..');

/**
 * Where the Next server reaches the API. The browser never talks to it directly:
 * it calls this app's own /api/v1, rewritten to the API below. One origin, so
 * the sign-in cookie is first-party and no CORS list has to be kept in step.
 */
const API_INTERNAL_URL = process.env.API_INTERNAL_URL || 'http://localhost:3001/api/v1';

/**
 * The 8 hand-built insight/analytics pages 10-admin-dashboard.md WO-E.2
 * retires, each replaced by a report-registry entry under `/admin/analytics/*`
 * (`report-registry.ts`). A permanent redirect, not a deleted route, so a
 * bookmark or a link shared before this rebuild still lands somewhere real.
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
  poweredByHeader: false,
  // A build can be written elsewhere, so it does not trample a running dev server's cache.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async redirects() {
    return RETIRED_INSIGHT_PAGES.map((route) => ({ ...route, permanent: true }));
  },
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${API_INTERNAL_URL}/:path*` }];
  },
  // Self-contained server bundle for the production image.
  output: 'standalone',
  outputFileTracingRoot: workspaceRoot,
  // The shared package is built to CommonJS for the API; read its TypeScript source so this app ships only what it imports.
  transpilePackages: ['@newax/shared'],
  experimental: { externalDir: true },
  webpack(config) {
    config.resolve.alias['@newax/shared$'] = path.join(workspaceRoot, 'packages/shared/src/index.ts');
    return config;
  },
  images: {
    // Placeholder swatches are SVGs we generate ourselves; the CSP keeps them inert.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      // Local uploads served by the API's files controller.
      { protocol: 'http', hostname: 'localhost', port: '3001' },
      { protocol: 'http', hostname: '127.0.0.1', port: '3001' },
      // Uploads and photographs on the storefront's own origin (/media).
      { protocol: 'http', hostname: 'localhost', port: '3000' },
      // Production object storage: set the host of S3_PUBLIC_URL here when deploying.
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
