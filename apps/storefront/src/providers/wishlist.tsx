'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { WishlistItem } from '@/types/api';
import { apiAuthed } from '@/lib/api';
import { useSession } from './session';

/**
 * Saved pieces. A wishlist belongs to an account, so for a signed-out visitor
 * it is empty and `toggle` reports `needs-sign-in`: the caller sends them to
 * the sign-in page rather than this provider guessing where to navigate.
 */
interface WishlistContextValue {
  items: WishlistItem[];
  loading: boolean;
  isSaved: (productId: string) => boolean;
  toggle: (productId: string) => Promise<'saved' | 'removed' | 'needs-sign-in' | 'failed'>;
  remove: (itemId: string) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== 'signed-in') {
      setItems([]);
      return;
    }
    let live = true;
    setLoading(true);
    apiAuthed<WishlistItem[]>('/wishlist')
      .then((list) => live && setItems(list))
      .catch(() => live && setItems([]))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [status]);

  const isSaved = useCallback((productId: string) => items.some((item) => item.productId === productId), [items]);

  const toggle = useCallback<WishlistContextValue['toggle']>(
    async (productId) => {
      if (status !== 'signed-in') return 'needs-sign-in';
      try {
        const existing = items.find((item) => item.productId === productId && item.variantId === null);
        if (existing) {
          await apiAuthed('/wishlist/' + encodeURIComponent(existing.id), { method: 'DELETE', expect: 'none' });
          setItems((current) => current.filter((item) => item.id !== existing.id));
          return 'removed';
        }
        const added = await apiAuthed<WishlistItem>('/wishlist', { method: 'POST', body: { productId } });
        setItems((current) => [added, ...current]);
        return 'saved';
      } catch {
        return 'failed';
      }
    },
    [status, items],
  );

  const remove = useCallback<WishlistContextValue['remove']>(async (itemId) => {
    await apiAuthed('/wishlist/' + encodeURIComponent(itemId), { method: 'DELETE', expect: 'none' });
    setItems((current) => current.filter((item) => item.id !== itemId));
  }, []);

  const value = useMemo(() => ({ items, loading, isSaved, toggle, remove }), [items, loading, isSaved, toggle, remove]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const value = useContext(WishlistContext);
  if (!value) throw new Error('useWishlist must be used inside WishlistProvider');
  return value;
}
