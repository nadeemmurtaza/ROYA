import { setRequestLocale } from 'next-intl/server';
import { OrderDetail } from '@/components/desk/OrderDetail';

export default async function DeskOrderPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <OrderDetail id={id} />;
}
