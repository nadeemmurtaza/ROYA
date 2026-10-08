import Link from 'next/link';
import './globals.css';

/**
 * Root 404, for a URL that matches no route at all (`/en/nonsense`, `/xyz`).
 *
 * Distinct from `(storefront)/[locale]/not-found.tsx`, which handles a
 * `notFound()` thrown *inside* a matched storefront route — a discontinued
 * product, say — and renders inside the shop's header and footer. Nothing
 * matched here, so no layout applies and this file supplies its own
 * `<html>`/`<body>`: this app has no `app/layout.tsx`, each route group owns
 * its own root layout, and an unmatched URL belongs to none of them.
 *
 * It is styled by the global stylesheet like every other page, and imports it
 * itself so it does not lean on a layout that this page exists to outlive. The
 * palette is therefore the product's own (tokens, both themes), not a copy.
 */
export default function RootNotFound() {
  return (
    <html lang="en">
      <body className="m-0 flex min-h-screen items-center justify-center bg-neutral-50 p-6 text-neutral-900">
        <div className="max-w-md text-center">
          <p className="m-0 text-xs font-semibold uppercase tracking-wider text-neutral-500">404</p>
          <h1 className="mt-3 text-2xl font-semibold">We couldn&apos;t find that page</h1>
          <p className="mt-3 text-sm text-neutral-600">The address may be mistyped, or the page may have moved.</p>
          <Link href="/admin" className="btn-primary mt-6">
            Back to the dashboard
          </Link>
        </div>
      </body>
    </html>
  );
}
