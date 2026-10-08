'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Whether the search overlay is open. The overlay itself lives in the header, but
 * the way in is not only the magnifier there: below 900px the header has no room
 * for it, so the menu opens search too. One switch, two doors.
 */
interface SearchContextValue {
  open: boolean;
  show: () => void;
  hide: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, show, hide }), [open, show, hide]);
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchContextValue {
  const value = useContext(SearchContext);
  if (!value) throw new Error('useSearch must be used inside <SearchProvider>');
  return value;
}
