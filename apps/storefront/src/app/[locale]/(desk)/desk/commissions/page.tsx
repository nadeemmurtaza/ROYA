import { setRequestLocale } from 'next-intl/server';
import { Commissions } from '@/components/desk/Commissions';

export default async function DeskCommissionsPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return <Commissions />;
}
