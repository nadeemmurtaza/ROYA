import type { ReactNode } from 'react';

/** Sign-in and its neighbours stand alone: no header to leave through, no footer. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <main id="content">{children}</main>
    </div>
  );
}
