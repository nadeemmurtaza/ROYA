'use client';

import './globals.css';

/**
 * Last-resort boundary, for a crash in a root layout itself.
 *
 * The per-section `error.tsx` files render *inside* their layout, so they
 * cannot catch a failure in that layout — if the storefront or admin layout
 * throws, only this file is left. That is also why it renders its own
 * `<html>`/`<body>`: at this point React has discarded the tree that normally
 * provides them, so nothing else will.
 *
 * It is styled by the global stylesheet like every other page. It imports
 * `globals.css` itself rather than relying on the layout that crashed to have
 * done it, so the Tailwind classes below always have their rules, and the
 * palette is the product's own tokens, not a second hand-copy.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="m-0 flex min-h-screen items-center justify-center bg-neutral-50 p-6 text-neutral-900">
        <div className="max-w-md text-center">
          <h1 className="m-0 text-xl font-semibold">Something went badly wrong</h1>
          <p className="mt-3 text-sm text-neutral-600">
            The site failed to start rendering. Reloading usually clears it.
          </p>
          <button type="button" onClick={reset} className="btn-primary mt-6">
            Reload
          </button>
          {error.digest ? <p className="mt-6 text-xs text-neutral-400">Reference: {error.digest}</p> : null}
        </div>
      </body>
    </html>
  );
}
