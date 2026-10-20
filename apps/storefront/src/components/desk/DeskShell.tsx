'use client';

import { useTranslations } from 'next-intl';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BRAND } from '@newax/shared';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { apiAuthed } from '@/lib/api';
import { deskSections, type DeskSection } from '@/lib/desk-model';
import { useSession } from '@/providers/session';
import { LocaleSwitch } from '../LocaleSwitch';
import { ThemeToggle } from '../ThemeToggle';

const HREF: Record<DeskSection, string> = {
  orders: '/desk',
  payments: '/desk/payments',
  commissions: '/desk/commissions',
  requests: '/desk/requests',
};
const LABEL: Record<DeskSection, string> = {
  orders: 'tabOrders',
  payments: 'tabPayments',
  commissions: 'tabCommissions',
  requests: 'tabRequests',
};

/** Which section a desk address belongs to. The order page is part of Orders. */
function sectionOf(pathname: string): DeskSection {
  if (pathname.startsWith('/desk/payments')) return 'payments';
  if (pathname.startsWith('/desk/commissions')) return 'commissions';
  if (pathname.startsWith('/desk/requests')) return 'requests';
  return 'orders';
}

interface DeskContextValue {
  /** Tell the tab badges that something they count has changed. */
  refresh: () => void;
  /** Whether the signed-in account holds a permission. Only decides what to show; the API decides what is allowed. */
  can: (permission: string) => boolean;
}

const DeskContext = createContext<DeskContextValue | null>(null);

export function useDesk(): DeskContextValue {
  const value = useContext(DeskContext);
  if (!value) throw new Error('useDesk must be used inside DeskShell');
  return value;
}

/** How many things a tab is waiting on. A failed count shows no badge: it is a hint, never a blocker. */
function useWaiting(path: string, query: Record<string, string>, enabled: boolean, tick: number): number {
  const [count, setCount] = useState(0);
  const key = JSON.stringify(query);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    apiAuthed<unknown[]>(path, { query: JSON.parse(key) as Record<string, string> })
      .then((rows) => live && setCount(Array.isArray(rows) ? rows.length : 0))
      .catch(() => live && setCount(0));
    return () => {
      live = false;
    };
  }, [path, key, enabled, tick]);
  return enabled ? count : 0;
}

/**
 * The frame around the atelier desk: who may be here, and the way between its
 * sections. Anonymous visitors are sent to sign in and brought back; an account
 * with no desk permission is told so plainly. The API enforces the permissions
 * on every call, so this only decides what is worth showing.
 */
export function DeskShell({ children }: { children: ReactNode }) {
  const t = useTranslations('desk');
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const [tick, setTick] = useState(0);

  const permissions = session.user?.permissions;
  const sections = useMemo(() => deskSections(permissions), [permissions]);
  const current = sectionOf(pathname);
  const allowed = sections.includes(current);

  useEffect(() => {
    if (session.status === 'anonymous') router.replace({ pathname: '/account', query: { next: pathname } });
  }, [session.status, router, pathname]);

  // A person who may see Payments but not Orders is not left on an empty Orders page.
  useEffect(() => {
    if (session.status === 'signed-in' && sections.length > 0 && !allowed) router.replace(HREF[sections[0]!]);
  }, [session.status, sections, allowed, router]);

  const can = useCallback((permission: string) => (permissions ?? []).includes(permission), [permissions]);
  const refresh = useCallback(() => setTick((value) => value + 1), []);
  const value = useMemo(() => ({ can, refresh }), [can, refresh]);

  const waitingPayments = useWaiting('/admin/payments/awaiting-approval', {}, sections.includes('payments'), tick);
  const newRequests = useWaiting('/admin/crm/leads', { status: 'NEW' }, sections.includes('requests'), tick);
  const badge: Partial<Record<DeskSection, number>> = { payments: waitingPayments, requests: newRequests };

  if (session.status !== 'signed-in' || !session.user) {
    return (
      <main id="content" className="desk-single">
        <p className="bag-muted" role="status">
          {t('loading')}
        </p>
      </main>
    );
  }

  if (sections.length === 0) {
    return (
      <main id="content" className="desk-single">
        <span className="eyebrow">{t('eyebrow')}</span>
        <h1 className="serif desk-title">{t('noAccessTitle')}</h1>
        <p className="bag-muted">{t('noAccessBody')}</p>
        <Link className="btn-gold" href="/">
          {t('noAccessHome')}
        </Link>
      </main>
    );
  }

  return (
    <DeskContext.Provider value={value}>
      <div className="desk">
        <header className="desk-bar">
          <Link href={HREF[sections[0]!]} className="desk-brand">
            <span className="logo">{BRAND.identity.shortName}</span>
            <span className="eyebrow">{t('eyebrow')}</span>
          </Link>
          <nav aria-label={t('navAria')} className="desk-tabs">
            {sections.map((id) => (
              <Link
                key={id}
                href={HREF[id]}
                className={`desk-tab${id === current ? ' desk-tab-on' : ''}`}
                aria-current={id === current ? 'page' : undefined}
              >
                {t(LABEL[id])}
                {badge[id] ? (
                  <span className="desk-badge" role="img" aria-label={t('waiting', { count: badge[id]! })}>
                    {badge[id]}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
          <div className="desk-tools">
            <ThemeToggle />
            <LocaleSwitch />
            <Link href="/" className="navlink">
              {t('viewShop')}
            </Link>
            <button
              type="button"
              className="tool-btn"
              onClick={async () => {
                await session.logout();
                router.replace('/');
              }}
            >
              {t('signOut')}
            </button>
          </div>
        </header>
        <main id="content" className="desk-page">
          {allowed ? children : null}
        </main>
      </div>
    </DeskContext.Provider>
  );
}
