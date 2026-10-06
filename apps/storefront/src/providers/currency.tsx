'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BASE_CURRENCY, formatPrice, isCurrency, type CurrencyCode } from '@/lib/money';

/**
 * The display currency the visitor chose in the header. It is remembered in
 * localStorage (a convenience, never needed to buy), and is purely cosmetic:
 * the order is always charged in AED, which the bag and checkout say aloud.
 */
const STORAGE_KEY = 'roya.cur';

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (next: CurrencyCode) => void;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: BASE_CURRENCY,
  setCurrency: () => undefined,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  // Server and first client render both use AED, so hydration agrees; the saved choice applies after mount.
  const [currency, setCurrencyState] = useState<CurrencyCode>(BASE_CURRENCY);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isCurrency(saved)) setCurrencyState(saved);
    } catch {
      /* storage blocked: stay on AED */
    }
  }, []);

  const setCurrency = useCallback((next: CurrencyCode) => {
    setCurrencyState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* the choice still holds for this page */
    }
  }, []);

  const value = useMemo(() => ({ currency, setCurrency }), [currency, setCurrency]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}

/**
 * A price in the visitor's currency. `charged` pins it to AED, for the lines a
 * customer is actually billed (bag total, checkout, order). A price is a number
 * and a code, so it is set left-to-right even inside Arabic text.
 */
export function Price({ minor, prefix, charged = false }: { minor: number; prefix?: string; charged?: boolean }) {
  const { currency } = useCurrency();
  const text = formatPrice(minor, charged ? BASE_CURRENCY : currency);
  return (
    <>
      {prefix ? `${prefix} ` : ''}
      <bdi dir="ltr">{text}</bdi>
    </>
  );
}

/**
 * " · indicative price, charged in AED", shown only when the visitor is looking
 * at a converted price. The note is the caller's translated text.
 */
export function IndicativeNote({ children }: { children: ReactNode }) {
  const { currency } = useCurrency();
  return currency === BASE_CURRENCY ? null : <> · {children}</>;
}
