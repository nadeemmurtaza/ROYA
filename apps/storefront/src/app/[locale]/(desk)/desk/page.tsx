import { setRequestLocale } from 'next-intl/server';
import { OrdersList } from '@/components/desk/OrdersList';

export default async function DeskOrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return <OrdersList />;
}
