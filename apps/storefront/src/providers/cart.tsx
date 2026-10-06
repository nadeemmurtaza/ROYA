'use client';

import { useLocale } from 'next-intl';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Cart } from '@/types/api';
import { api } from '@/lib/api';

/**
 * The bag. The cart lives in the API, keyed by a cookie it sets (a guest never
 * has to sign in to buy), so this provider holds a copy and re-reads it after
 * every change rather than computing totals itself: the API is the one place
 * that knows stock, deposits and VAT.
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
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    await run(() => api<Cart>('/cart', { query: { locale } }));
    setLoading(false);
  }, [run, locale]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const add = useCallback<CartContextValue['add']>(
    (variantId, quantity = 1, stitching) =>
      run(() => api<Cart>('/cart/items', { method: 'POST', query: { locale }, body: { variantId, quantity, ...(stitching ? { stitching } : {}) } })),
    [run, locale],
  );

  const setQuantity = useCallback<CartContextValue['setQuantity']>(
    async (lineId, quantity) => {
      await run(() => api<Cart>(`/cart/items/${encodeURIComponent(lineId)}`, { method: 'PATCH', query: { locale }, body: { quantity } }));
    },
    [run, locale],
  );

  const remove = useCallback<CartContextValue['remove']>(
    async (lineId) => {
      await run(() => api<Cart>(`/cart/items/${encodeURIComponent(lineId)}`, { method: 'DELETE', query: { locale } }));
    },
    [run, locale],
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
