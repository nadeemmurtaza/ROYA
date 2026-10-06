import type { ReactNode } from 'react';

/** The focus frame: each page supplies its own FocusHeader; there is no footer to wander off to. */
export default function FocusLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <main id="content">{children}</main>
    </div>
  );
}
