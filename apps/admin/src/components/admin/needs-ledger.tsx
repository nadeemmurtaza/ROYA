'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { PageHeader } from '@/components/ui/page-header';
import { ROUTES } from '@/constants/routes';
import { pageGate } from '@/utils/module-gate';
import { useEnabledModules } from './deployment-modules';

/**
 * How long to wait for the module list before giving up on it. `GET /meta` is
 * a static read, so 5 000 ms without an answer means the API is unwell, and
 * then the page's own error state is the honest thing to show, not a spinner
 * that never ends.
 */
const META_WAIT_MS = 5_000;

/**
 * A page that is a view over the general ledger (profit & loss, cash flow,
 * fiscal periods). The `accounting` module is off by default, so its
 * endpoints answer 404 and the page would otherwise load into a red error
 * banner; this says what the page needs instead of failing.
 *
 * Unlike the nav and the dashboard, which show an item until the module list
 * says otherwise, this waits for the list before rendering the page. The page
 * fires its requests the moment it mounts, so failing open here would send
 * them to endpoints that are not there, on every hard load of the URL.
 */
export function NeedsLedger({ what, children }: { what: string; children: ReactNode }) {
  const enabledModules = useEnabledModules();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (enabledModules) return;
    const handle = setTimeout(() => setGaveUp(true), META_WAIT_MS);
    return () => clearTimeout(handle);
  }, [enabledModules]);

  const gate = pageGate('accounting', enabledModules, gaveUp);
  if (gate === 'wait') return <Loading label={`Loading ${what}`} />;
  if (gate === 'show') return <>{children}</>;
  // Off is a page with a name and a way out, not a blank screen: the views that work without the ledger are one click away.
  return (
    <>
      <PageHeader title={what} description="This view reads the general ledger, which is switched off for this deployment." />
      <EmptyState
        title={`${what} needs the general ledger`}
        description="Margins, unit economics and expenses work without it."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={ROUTES.admin.financeMargins} className="btn-primary">
              Margins
            </Link>
            <Link href={ROUTES.admin.financeExpenses} className="btn-secondary">
              Expenses
            </Link>
          </div>
        }
      />
    </>
  );
}
