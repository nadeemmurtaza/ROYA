import { ApiError, request, requestWithRefresh, singleFlight, type RequestOptions } from '@newax/shared';
import type { AuthUser } from '@/types/api';
import { API_URL } from './env';

export { ApiError };

/**
 * The storefront's HTTP layer.
 *
 *   api()        public endpoints (catalogue, cart, checkout). Sends cookies so
 *                the guest cart follows the visitor.
 *   apiAuthed()  signed-in endpoints. Attaches the access token and, on a 401,
 *                refreshes once and retries (shared requestWithRefresh).
 *
 * The access token lives in this module's memory and nowhere else: not
 * localStorage, where any script on the page could read it. A reload loses it,
 * and `restoreSession` gets a new one from the httpOnly refresh cookie.
 */
let accessToken: string | null = null;

/** Only a hint that a refresh is worth trying, so an anonymous visitor makes no failing request. The cookie itself is httpOnly. */
const SESSION_HINT_KEY = 'roya.session';

function hint(value?: boolean): boolean {
  try {
    if (value === true) window.localStorage.setItem(SESSION_HINT_KEY, '1');
    else if (value === false) window.localStorage.removeItem(SESSION_HINT_KEY);
    else return window.localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    /* storage blocked: treat as signed out */
  }
  return false;
}

export function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(API_URL, path, { credentials: 'include', ...options });
}

interface AuthResult {
  accessToken: string;
  user: AuthUser;
}

/** One refresh at a time: five requests failing together must send one /auth/refresh, not five. */
const refreshOnce = singleFlight(async (): Promise<AuthResult | null> => {
  try {
    const result = await api<AuthResult>('/auth/refresh', { method: 'POST', body: {} });
    accessToken = result.accessToken;
    hint(true);
    return result;
  } catch {
    accessToken = null;
    hint(false);
    return null;
  }
});

let onExpired: () => void = () => undefined;

/** Called when a session cannot be saved, so the provider can drop to signed-out. */
export function setSessionExpiredHandler(handler: () => void): void {
  onExpired = handler;
}

export function apiAuthed<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return requestWithRefresh<T>(
    API_URL,
    path,
    { credentials: 'include', ...options },
    {
      token: () => accessToken,
      refresh: async () => (await refreshOnce()) !== null,
      onExpired: () => {
        accessToken = null;
        hint(false);
        onExpired();
      },
      expiredMessage: 'Your session has ended. Please sign in again.',
    },
  );
}

/** On page load: a returning client gets their session back from the refresh cookie. */
export async function restoreSession(): Promise<AuthUser | null> {
  if (!hint()) return null;
  return (await refreshOnce())?.user ?? null;
}

export async function signIn(identifier: string, password: string): Promise<AuthUser> {
  const result = await api<AuthResult>('/auth/login', {
    method: 'POST',
    body: { identifier, password },
    fallbackMessage: 'Sign-in failed.',
  });
  accessToken = result.accessToken;
  hint(true);
  return result.user;
}

export async function signUp(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}): Promise<AuthUser> {
  const result = await api<AuthResult>('/auth/register', {
    method: 'POST',
    body: input,
    fallbackMessage: 'We could not create the account.',
  });
  accessToken = result.accessToken;
  hint(true);
  return result.user;
}

export async function signOut(): Promise<void> {
  try {
    await api<void>('/auth/logout', { method: 'POST', body: {}, expect: 'none' });
  } finally {
    accessToken = null;
    hint(false);
  }
}
