import { setRequestLocale } from 'next-intl/server';
import { PaymentsQueue } from '@/components/desk/PaymentsQueue';

export default async function DeskPaymentsPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return <PaymentsQueue />;
}
