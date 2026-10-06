'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser } from '@/types/api';
import { restoreSession, setSessionExpiredHandler, signIn, signOut, signUp } from '@/lib/api';

type Status = 'loading' | 'anonymous' | 'signed-in';

interface SessionContextValue {
  status: Status;
  user: AuthUser | null;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  register: (input: Parameters<typeof signUp>[0]) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let live = true;
    setSessionExpiredHandler(() => {
      setUser(null);
      setStatus('anonymous');
    });
    restoreSession().then((restored) => {
      if (!live) return;
      setUser(restored);
      setStatus(restored ? 'signed-in' : 'anonymous');
    });
    return () => {
      live = false;
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const signedIn = await signIn(identifier, password);
    setUser(signedIn);
    setStatus('signed-in');
    return signedIn;
  }, []);

  const register = useCallback(async (input: Parameters<typeof signUp>[0]) => {
    const created = await signUp(input);
    setUser(created);
    setStatus('signed-in');
    return created;
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut();
    } finally {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo(() => ({ status, user, login, register, logout }), [status, user, login, register, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
