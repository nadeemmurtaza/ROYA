'use client';

import type { ReactNode } from 'react';
import { CartProvider } from './cart';
import { CurrencyProvider } from './currency';
import { SessionProvider } from './session';
import { WishlistProvider } from './wishlist';

/** Everything client-side that more than one page shares: currency, session, bag. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <CurrencyProvider>
      <SessionProvider>
        <CartProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </CartProvider>
      </SessionProvider>
    </CurrencyProvider>
  );
}
