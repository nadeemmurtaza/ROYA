import type { ReactNode } from 'react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

/** The full frame: top bar, header, footer. Every browsing page sits in it. */
export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <Header />
      <main id="content">{children}</main>
      <Footer />
    </div>
  );
}
