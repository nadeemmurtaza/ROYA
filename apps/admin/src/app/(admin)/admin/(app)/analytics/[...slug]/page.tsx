'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { reportFor } from '@/components/admin/analytics/report-registry';
import { AnalyticsDetailPage } from '@/components/admin/analytics/analytics-detail-page';
import { ReportList } from '@/components/admin/analytics/report-list';
import { DASHBOARD_GROUPS } from '@/components/admin/dashboard/card-registry';
import { PageHeader } from '@/components/ui';
import { ROUTES } from '@/constants/routes';

/**
 * One catch-all route for every analytics detail page (10-admin-dashboard.md
 * D3) — the slug is looked up in `report-registry.ts` and rendered through
 * `<AnalyticsDetailPage>`. Next resolves static segments before catch-alls,
 * so a report that outgrows this config shape gets its own real route file
 * at the same path and automatically wins — the designed escape hatch,
 * never a ninth block kind bolted onto this one.
 */
export default function AnalyticsReportPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = use(params);
  const report = reportFor(slug.join('/'));

  if (report) return <AnalyticsDetailPage report={report} />;

  // A dashboard group heading ("Sales") and a report's breadcrumb lead to the group itself: its reports, listed.
  const group = slug.length === 1 ? DASHBOARD_GROUPS.find((entry) => entry.key === slug[0]) : undefined;
  if (!group) notFound();

  return (
    <>
      <PageHeader
        title={group.label}
        description="Every report in this group."
        context={<Link href={ROUTES.admin.analytics}>All analytics</Link>}
      />
      <ReportList group={group.key} />
    </>
  );
}
