import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return { title: t('stepDelivery'), robots: { index: false } };
}

export default function CheckoutPage() {
  return <CheckoutFlow />;
}
