'use client';

import Link from 'next/link';
import { EmptyState, Section } from '@/components/ui';
import { useAdminSession } from '@/components/admin/session';
import { useEnabledModules } from '@/components/admin/deployment-modules';
import { DASHBOARD_GROUPS, type DashboardGroupKey } from '@/components/admin/dashboard/card-registry';
import { reportsFor } from '@/components/admin/analytics/report-registry';
import { ROUTES } from '@/constants/routes';

/**
 * The reports the caller may open, grouped as the dashboard groups its cards.
 * With `group` it lists one group only: the page a dashboard group heading and a
 * report's breadcrumb lead to. A report the caller lacks permission for is absent
 * here (unlike a dashboard card, which renders as an em-dash): this list is the
 * entry point, not a tile grid with its own permission-aware rendering per row.
 */
export function ReportList({ group }: { group?: DashboardGroupKey }) {
  const session = useAdminSession();
  const enabledModules = useEnabledModules();
  const reports = reportsFor(enabledModules ?? [])
    .filter((report) => report.permissions.length === 0 || report.permissions.some((key) => session.can(key)))
    .filter((report) => !group || report.group === group);

  if (reports.length === 0) {
    return (
      <EmptyState
        title="No reports available."
        description="Ask an administrator for access if you need one."
        action={
          group ? (
            <Link href={ROUTES.admin.analytics} className="btn-secondary">
              All analytics
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {DASHBOARD_GROUPS.map((entry) => {
        const groupReports = reports.filter((report) => report.group === entry.key);
        if (groupReports.length === 0) return null;
        return (
          <Section key={entry.key} title={group ? undefined : entry.label}>
            <ul className="flex flex-col divide-y divide-neutral-100">
              {groupReports.map((report) => (
                <li key={report.slug} className="py-2">
                  <Link
                    href={ROUTES.admin.analyticsReport(report.slug)}
                    className="font-medium text-neutral-900 hover:underline"
                  >
                    {report.title}
                  </Link>
                  <p className="text-sm text-neutral-900/60">{report.description}</p>
                </li>
              ))}
            </ul>
          </Section>
        );
      })}
    </div>
  );
}
