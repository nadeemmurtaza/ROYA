'use client';

import { PageHeader } from '@/components/ui';
import { ReportList } from '@/components/admin/analytics/report-list';

/** The analytics report index: every report behind the dashboard's cards, in one place. */
export default function AnalyticsIndexPage() {
  return (
    <>
      <PageHeader title="Analytics" description="Every report behind the dashboard's cards, in one place." />
      <ReportList />
    </>
  );
}
