import type { ReactNode } from 'react';

/**
 * The document itself (<html>, <body>) is written by app/[locale]/layout.tsx,
 * because its language and direction depend on the locale in the URL.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
