'use client';

import { useLocale } from 'next-intl';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Cart } from '@/types/api';
import { api, apiAuthed } from '@/lib/api';
import { useSession } from './session';

/**
 * The bag. The cart lives in the API, keyed by a cookie it sets (a guest never
 * has to sign in to buy), so this provider holds a copy and re-reads it after
 * every change rather than computing totals itself: the API is the one place
 * that knows stock, deposits and VAT.
 *
 * A signed-in client's bag is their account's, and the API only finds it when
 * the request carries their token, so every call below is authenticated while
 * a session exists. The moment someone signs in, the guest bag they were
 * filling is folded into their account's (POST /cart/merge): signing in at
 * checkout must never empty the bag.
 */
interface CartContextValue {
  cart: Cart | null;
  /** True until the first read has finished, so the header does not flash "0". */
  loading: boolean;
  busy: boolean;
  error: string | null;
  add: (variantId: string, quantity?: number, stitching?: Record<string, unknown>) => Promise<boolean>;
  setQuantity: (lineId: string, quantity: number) => Promise<void>;
  remove: (lineId: string) => Promise<void>;
  reload: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  // Every cart call names the language so product names come back in it.
  const locale = useLocale();
  const { status } = useSession();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guestToken = useRef<string | null>(null);

  const send = useCallback(
    <T,>(path: string, options: Parameters<typeof api>[1] = {}): Promise<T> =>
      (status === 'signed-in' ? apiAuthed : api)<T>(path, { ...options, query: { locale } }),
    [status, locale],
  );

  const run = useCallback(async (action: () => Promise<Cart>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      setCart(await action());
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong.');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const reload = useCallback(async () => {
    await run(() => send<Cart>('/cart'));
    setLoading(false);
  }, [run, send]);

  // Remember the guest bag's token while nobody is signed in, to fold it in at sign-in.
  useEffect(() => {
    if (status === 'anonymous' && cart) guestToken.current = cart.token;
  }, [cart, status]);

  useEffect(() => {
    // Wait for the session to be known: reading the bag as a guest, then again as a client, would flash the wrong one.
    if (status === 'loading') return;
    const token = status === 'signed-in' ? guestToken.current : null;
    guestToken.current = null;
    void (async () => {
      if (token) {
        await run(() => apiAuthed<Cart>('/cart/merge', { method: 'POST', body: { token } }));
      }
      await reload();
    })();
  }, [status, reload, run]);

  const add = useCallback<CartContextValue['add']>(
    (variantId, quantity = 1, stitching) =>
      run(() =>
        send<Cart>('/cart/items', {
          method: 'POST',
          body: { variantId, quantity, ...(stitching ? { stitching } : {}) },
        }),
      ),
    [run, send],
  );

  const setQuantity = useCallback<CartContextValue['setQuantity']>(
    async (lineId, quantity) => {
      await run(() => send<Cart>(`/cart/items/${encodeURIComponent(lineId)}`, { method: 'PATCH', body: { quantity } }));
    },
    [run, send],
  );

  const remove = useCallback<CartContextValue['remove']>(
    async (lineId) => {
      await run(() => send<Cart>(`/cart/items/${encodeURIComponent(lineId)}`, { method: 'DELETE' }));
    },
    [run, send],
  );

  const value = useMemo(
    () => ({ cart, loading, busy, error, add, setQuantity, remove, reload }),
    [cart, loading, busy, error, add, setQuantity, remove, reload],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside CartProvider');
  return value;
}
