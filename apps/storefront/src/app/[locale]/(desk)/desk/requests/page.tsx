import { setRequestLocale } from 'next-intl/server';
import { Requests } from '@/components/desk/Requests';

export default async function DeskRequestsPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return <Requests />;
}
